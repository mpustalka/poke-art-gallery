import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  voteSchema,
  pollEntrySchema,
  pollSettingsSchema,
  canonicalPokemon,
  pokemonLabel,
} from "../lib/poll.ts";
import {
  claimVoteSQL,
  incrementVoteSQL,
  adjustVoteSQL,
  readPollSQL,
} from "../lib/poll-store.ts";

test("poll validates real species, normalizes emails, and rejects invalid submissions", () => {
  const vote = voteSchema.parse({
    name: "  Mira  ",
    email: "  MIRA@example.com  ",
    pokemon: "  Mr. Mime ",
  });
  assert.equal(vote.name, "Mira");
  assert.equal(vote.email, "mira@example.com");
  assert.equal(vote.pokemon, "mr-mime");
  assert.equal(canonicalPokemon("Nidoran ♀"), "nidoran-f");
  assert.equal(canonicalPokemon("Flabébé"), "flabebe");
  assert.equal(canonicalPokemon("Farfetch’d"), "farfetchd");
  assert.equal(pokemonLabel("ho-oh"), "Ho-Oh");
  for (const patch of [
    { pokemon: "<script>" },
    { pokemon: "invented monster" },
    { name: "" },
    { email: "bad" },
    { website: "spam" },
  ]) {
    assert.equal(
      voteSchema.safeParse({
        name: "Mira",
        email: "mira@example.com",
        pokemon: "eevee",
        ...patch,
      }).success,
      false,
    );
  }
  for (const votes of [-1, 2.4, 1000001])
    assert.equal(
      pollEntrySchema.safeParse({ round: 1, pokemon: "Eevee", votes }).success,
      false,
    );
});

test("poll database enforces cooldowns, separates adjustments, archives rounds and rolls back failed votes", async () => {
  const db = new PGlite();
  try {
    for (const file of (await readdir("netlify/database/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(
        await readFile("netlify/database/migrations/" + file, "utf8"),
      );
    }
    const {
      rows: [settings],
    } = await db.query("SELECT data FROM shop_poll_settings");
    assert.equal(pollSettingsSchema.parse(settings.data).enabled, true);
    assert.equal(
      pollSettingsSchema.safeParse({
        ...settings.data,
        bannerImage: "javascript:alert(1)",
      }).success,
      false,
    );
    assert.equal(
      pollSettingsSchema.safeParse({
        ...settings.data,
        bannerImage: "/artworks/pikachu.webp",
      }).success,
      true,
    );

    // Two submissions for the same email cannot both claim the cooldown.
    const attempts = await Promise.all([
      db.query(claimVoteSQL, ["mira@example.com", "Mira"]),
      db.query(claimVoteSQL, ["mira@example.com", "Mira"]),
    ]);
    assert.equal(
      attempts.reduce((n, result) => n + result.rows.length, 0),
      1,
    );
    await db.query(incrementVoteSQL, [1, "eevee"]);
    await db.query(
      "UPDATE shop_poll_voters SET last_voted_at=now()-interval '6 days 23 hours' WHERE email=$1",
      ["mira@example.com"],
    );
    assert.equal(
      (await db.query(claimVoteSQL, ["mira@example.com", "Mira"])).rows.length,
      0,
    );
    await db.query(
      "UPDATE shop_poll_voters SET last_voted_at=now()-interval '7 days 1 second' WHERE email=$1",
      ["mira@example.com"],
    );
    assert.equal(
      (await db.query(claimVoteSQL, ["mira@example.com", "Mira"])).rows.length,
      1,
    );
    await db.query(incrementVoteSQL, [1, "eevee"]);

    // Setting a displayed total never rewrites genuine submissions.
    await db.query(adjustVoteSQL, [1, "eevee", 30]);
    let {
      rows: [entry],
    } = await db.query("SELECT * FROM shop_poll_entries WHERE pokemon='eevee'");
    assert.equal(entry.actual_votes, 2);
    assert.equal(entry.adjustment, 28);
    await db.query(adjustVoteSQL, [1, "eevee", 0]);
    await db.query(incrementVoteSQL, [1, "eevee"]);
    ({
      rows: [entry],
    } = await db.query(
      "SELECT * FROM shop_poll_entries WHERE pokemon='eevee'",
    ));
    assert.equal(entry.actual_votes + entry.adjustment, 1);

    await db.query(
      "UPDATE shop_poll_settings SET round=round+1 WHERE id=1 AND round=1",
    );
    assert.equal(
      (
        await db.query(
          "UPDATE shop_poll_settings SET round=round+1 WHERE id=1 AND round=1 RETURNING round",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("SELECT * FROM shop_poll_entries WHERE round=2")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("SELECT * FROM shop_poll_entries WHERE round=1")).rows
        .length,
      1,
    );
    assert.equal(
      (await db.query(claimVoteSQL, ["mira@example.com", "Mira"])).rows.length,
      0,
    );

    // The public snapshot contains exactly the top five but totals all contenders.
    for (const [pokemon, votes] of [
      ["pikachu", 12],
      ["eevee", 12],
      ["mew", 8],
      ["gengar", 5],
      ["snorlax", 3],
      ["dragonite", 1],
    ]) {
      await db.query(adjustVoteSQL, [2, pokemon, votes]);
    }
    const {
      rows: [publicPoll],
    } = await db.query(readPollSQL, [false, 5]);
    assert.equal(publicPoll.entries.length, 5);
    assert.deepEqual(
      publicPoll.entries.map((e) => e.pokemon),
      ["eevee", "pikachu", "mew", "gengar", "snorlax"],
    );
    assert.equal(publicPoll.total, 41);
    assert.equal(publicPoll.entries[0].actual_votes, null);
    assert.equal(publicPoll.entries[0].adjustment, null);
    assert.equal(
      JSON.stringify(publicPoll).includes("mira@example.com"),
      false,
    );
    const {
      rows: [adminPoll],
    } = await db.query(readPollSQL, [true, 2000]);
    assert.equal(adminPoll.entries.length, 6);
    assert.equal(adminPoll.entries[0].adjustment, 12);
    await db.query(
      `UPDATE shop_poll_settings SET data=jsonb_set(data,'{enabled}','false')`,
    );
    const {
      rows: [hiddenPoll],
    } = await db.query(readPollSQL, [false, 5]);
    assert.equal(hiddenPoll.entries.length, 0);
    assert.equal(hiddenPoll.total, 0);

    // A failed vote leaves the voter eligible to retry.
    await db.exec("BEGIN");
    await db.query(claimVoteSQL, ["kai@example.com", "Kai"]);
    await db.exec("ROLLBACK");
    assert.equal(
      (await db.query(claimVoteSQL, ["kai@example.com", "Kai"])).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
