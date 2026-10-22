// Shared SQL keeps cooldown enforcement atomic, including simultaneous submissions.
export const claimVoteSQL = `
  INSERT INTO shop_poll_voters (email, name, last_voted_at)
  VALUES ($1, $2, now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, last_voted_at = now()
  WHERE shop_poll_voters.last_voted_at <= now() - interval '7 days'
  RETURNING last_voted_at + interval '7 days' AS next_vote_at
`;
export const incrementVoteSQL = `
  INSERT INTO shop_poll_entries (round, pokemon, actual_votes)
  VALUES ($1, $2, 1)
  ON CONFLICT (round, pokemon) DO UPDATE
  SET actual_votes = shop_poll_entries.actual_votes + 1
`;
export const adjustVoteSQL = `
  INSERT INTO shop_poll_entries (round, pokemon, adjustment)
  VALUES ($1, $2, $3)
  ON CONFLICT (round, pokemon) DO UPDATE
  SET adjustment = $3 - shop_poll_entries.actual_votes
  RETURNING adjustment
`;

export const readPollSQL = `
  SELECT s.round, s.data,
    COALESCE((SELECT jsonb_agg(e ORDER BY e.votes DESC, e.pokemon) FROM (
      SELECT pokemon, actual_votes + adjustment AS votes,
        CASE WHEN $1::boolean THEN actual_votes ELSE NULL END AS actual_votes,
        CASE WHEN $1::boolean THEN adjustment ELSE NULL END AS adjustment
      FROM shop_poll_entries WHERE round=s.round AND ($1::boolean OR s.data->>'enabled'='true')
      ORDER BY votes DESC, pokemon LIMIT $2
    ) e), '[]'::jsonb) AS entries,
    COALESCE((SELECT sum(actual_votes + adjustment)::integer FROM shop_poll_entries
      WHERE round=s.round AND ($1::boolean OR s.data->>'enabled'='true')), 0) AS total
  FROM shop_poll_settings s WHERE id=1
`;
