import { z } from "zod";
import { getDatabase } from "@netlify/database";
import type { PollData, PollEntry, PollSettings } from "./poll.ts";
import {
  claimVoteSQL,
  incrementVoteSQL,
  adjustVoteSQL,
  readPollSQL,
} from "./poll-store.ts";
import { pollEntrySchema, pollSettingsSchema, voteSchema } from "./poll.ts";

export class PollError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function readPoll(admin = false): Promise<PollData> {
  const db = getDatabase();
  // Read settings and counts in one snapshot so a round change cannot mix results.
  const {
    rows: [row],
  } = await db.pool.query(readPollSQL, [admin, admin ? 2000 : 5]);
  return {
    settings: row.data as PollSettings,
    round: row.round as number,
    entries: (row.entries as PollEntry[]).map((entry) =>
      admin ? entry : { pokemon: entry.pokemon, votes: entry.votes },
    ),
    total: row.total as number,
  };
}
export async function submitVote(raw: unknown) {
  const input = voteSchema.parse(raw);
  const client = await getDatabase().pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [poll],
    } = await client.query(
      "SELECT round, data FROM shop_poll_settings WHERE id=1 FOR SHARE",
    );
    if (!poll.data.enabled || !poll.data.open)
      throw new PollError(
        409,
        "Voting is closed. Check back for the next poll.",
      );
    const { rows } = await client.query(claimVoteSQL, [
      input.email,
      input.name,
    ]);
    if (!rows.length) {
      const {
        rows: [voter],
      } = await client.query(
        "SELECT last_voted_at + interval '7 days' AS next_vote_at FROM shop_poll_voters WHERE email=$1",
        [input.email],
      );
      throw new PollError(
        429,
        `This email can vote again on ${new Date(voter.next_vote_at).toUTCString()}.`,
      );
    }
    await client.query(incrementVoteSQL, [poll.round, input.pokemon]);
    await client.query("COMMIT");
    return { saved: true, nextVoteAt: rows[0].next_vote_at };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function savePollSettings(raw: unknown) {
  const settings = pollSettingsSchema.parse(raw);
  await getDatabase()
    .sql`UPDATE shop_poll_settings SET data=${JSON.stringify(settings)}::jsonb WHERE id=1`;
  return { saved: true };
}
export async function adjustPollEntry(raw: unknown, adminId: string) {
  const entry = pollEntrySchema.parse(raw);
  const client = await getDatabase().pool.connect();
  try {
    await client.query("BEGIN");
    const {
      rows: [poll],
    } = await client.query(
      "SELECT round FROM shop_poll_settings WHERE id=1 FOR SHARE",
    );
    if (poll.round !== entry.round)
      throw new PollError(
        409,
        "A new poll has started. Refresh the admin page before adjusting votes.",
      );
    const {
      rows: [result],
    } = await client.query(adjustVoteSQL, [
      poll.round,
      entry.pokemon,
      entry.votes,
    ]);
    await client.query(
      "INSERT INTO shop_poll_adjustments (round,pokemon,adjustment,admin_id) VALUES ($1,$2,$3,$4)",
      [poll.round, entry.pokemon, result.adjustment, adminId],
    );
    await client.query("COMMIT");
    return { saved: true };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
export async function startPollRound(raw: unknown) {
  const { round } = z.object({ round: z.number().int().min(1) }).parse(raw);
  const rows = await getDatabase()
    .sql`UPDATE shop_poll_settings SET round=round+1 WHERE id=1 AND round=${round} RETURNING round`;
  if (!rows.length)
    throw new PollError(
      409,
      "A fresh poll was already started. Refresh the admin page.",
    );
  return { saved: true };
}
