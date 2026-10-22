"use client";
import { useEffect, useState } from "react";
import type { Catalog } from "@/lib/commerce";
import { api } from "@/lib/commerce";
import type { PollData, PollSettings } from "@/lib/poll";
import { pokemonLabel } from "@/lib/poll";
import { ImagePicker } from "./admin-extras";
import { PokemonSuggestions } from "./poll";

export default function PollAdmin({ catalog }: { catalog: Catalog }) {
  const [data, setData] = useState<PollData | null>(null);
  const [draft, setDraft] = useState<PollSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmRound, setConfirmRound] = useState(false);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    let active = true;
    api<PollData>("poll/admin")
      .then((result) => {
        if (active) {
          setData(result);
          setDraft(result.settings);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function action(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
      const next = await api<PollData>("poll/admin");
      setData(next);
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {error && (
        <p role="alert" className="shop-error shop-notice">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="shop-success shop-notice">
          {message}
        </p>
      )}
    </>
  );
  if (!data || !draft)
    return (
      <div className="shop-panel">
        {feedback}
        {!error ? (
          <p role="status">Loading poll controls…</p>
        ) : (
          <button
            className="shop-button"
            onClick={() => {
              setError("");
              void api<PollData>("poll/admin")
                .then((next) => {
                  setData(next);
                  setDraft(next.settings);
                })
                .catch((e) => setError(e.message));
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  function field<K extends keyof PollSettings>(key: K, value: PollSettings[K]) {
    setDraft((previous) => previous && { ...previous, [key]: value });
  }
  const disabled = busy || uploading;
  return (
    <div className="poll-admin-content">
      {feedback}
      <form
        className="shop-form shop-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void action(
            () =>
              api("poll/settings", {
                method: "PUT",
                body: JSON.stringify(draft),
              }),
            "Poll and banner settings saved.",
          );
        }}
      >
        <fieldset disabled={disabled}>
          <legend>Poll &amp; next print banner</legend>
          <p className="shop-muted">
            Poll {data.round} · {data.total.toLocaleString()} displayed votes.
            Changes appear on the homepage within ten seconds.
          </p>
          <div className="shop-fields">
            <label className="shop-consent">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => field("enabled", e.target.checked)}
              />
              Show voting section
            </label>
            <label className="shop-consent">
              <input
                type="checkbox"
                checked={draft.open}
                onChange={(e) => field("open", e.target.checked)}
              />
              Accept votes
            </label>
          </div>
          <label>
            Poll title
            <input
              value={draft.title}
              required
              maxLength={120}
              onChange={(e) => field("title", e.target.value)}
            />
          </label>
          <label>
            Poll description
            <textarea
              value={draft.description}
              maxLength={500}
              rows={2}
              onChange={(e) => field("description", e.target.value)}
            />
          </label>
          <hr />
          <label className="shop-consent">
            <input
              type="checkbox"
              checked={draft.bannerEnabled}
              onChange={(e) => field("bannerEnabled", e.target.checked)}
            />
            Show next print banner beneath the main hero
          </label>
          <label>
            Banner headline
            <input
              value={draft.bannerTitle}
              required
              maxLength={120}
              onChange={(e) => field("bannerTitle", e.target.value)}
            />
          </label>
          <label>
            This week’s poll winner (optional)
            <input
              value={draft.bannerWinner}
              maxLength={80}
              onChange={(e) => field("bannerWinner", e.target.value)}
              placeholder="Eevee"
            />
          </label>
          <label>
            Banner text
            <textarea
              value={draft.bannerText}
              maxLength={600}
              rows={3}
              onChange={(e) => field("bannerText", e.target.value)}
            />
          </label>
          <ImagePicker
            value={draft.bannerImage}
            onChange={(value) => field("bannerImage", value)}
            images={catalog.products.flatMap((p) => p.images)}
            onUploading={setUploading}
            optional
          />
          <label>
            Image description
            <input
              value={draft.bannerImageAlt}
              maxLength={180}
              onChange={(e) => field("bannerImageAlt", e.target.value)}
            />
          </label>
        </fieldset>
        <button className="shop-button" disabled={disabled}>
          {busy ? "Saving…" : "Save poll & banner"}
        </button>
      </form>
      <section
        className="shop-panel shop-form"
        aria-labelledby="poll-adjust-title"
      >
        <h2 id="poll-adjust-title">Manage the leaderboard</h2>
        <p>
          Set a displayed total to add votes or settle a tie. Submitted votes
          are kept separately from manual adjustments, which are recorded for
          auditing. Choose a winner for the banner below, then save the banner
          settings above.
        </p>
        <p className="shop-muted">
          The homepage shows only the top five. This list includes every
          nominated Pokémon. Counts do not reset automatically; start a fresh
          poll when you’re ready.
        </p>
        <form
          className="shop-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const values = new FormData(form);
            void action(async () => {
              await api("poll/entry", {
                method: "PUT",
                body: JSON.stringify({
                  pokemon: values.get("pokemon"),
                  votes: Number(values.get("votes")),
                  round: data.round,
                }),
              });
              form.reset();
            }, "Pokémon total saved.");
          }}
        >
          <fieldset disabled={disabled} className="shop-fields">
            <legend>Add a contender or set its total</legend>
            <label>
              Pokémon
              <input
                name="pokemon"
                list="admin-pokemon"
                required
                maxLength={80}
                placeholder="Pokémon name"
              />
            </label>
            <label>
              Displayed votes
              <input
                name="votes"
                type="number"
                required
                min={0}
                max={1000000}
                defaultValue={0}
              />
            </label>
            <button className="shop-button" disabled={disabled}>
              Set total
            </button>
          </fieldset>
        </form>
        <PokemonSuggestions id="admin-pokemon" />
        <label>
          Find a contender
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter Pokémon…"
          />
        </label>
        <div className="poll-admin-entries">
          {data.entries
            .filter((entry) =>
              pokemonLabel(entry.pokemon)
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((entry) => (
              <form
                key={entry.pokemon + ":" + entry.votes + ":" + data.round}
                className="poll-admin-entry"
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void action(
                    () =>
                      api("poll/entry", {
                        method: "PUT",
                        body: JSON.stringify({
                          pokemon: entry.pokemon,
                          votes: Number(values.get("votes")),
                          round: data.round,
                        }),
                      }),
                    "Displayed vote total updated.",
                  );
                }}
              >
                <div>
                  <strong>{pokemonLabel(entry.pokemon)}</strong>
                  <small>
                    {entry.actual_votes} submitted ·{" "}
                    {entry.adjustment! >= 0 ? "+" : ""}
                    {entry.adjustment} adjustment
                  </small>
                </div>
                <label>
                  Displayed votes
                  <input
                    type="number"
                    name="votes"
                    aria-label={`Displayed votes for ${pokemonLabel(entry.pokemon)}`}
                    required
                    min={0}
                    max={1000000}
                    defaultValue={entry.votes}
                    disabled={disabled}
                  />
                </label>
                <button
                  className="shop-button shop-secondary"
                  disabled={disabled}
                >
                  Update
                </button>
                <button
                  type="button"
                  className="shop-link-button"
                  disabled={disabled}
                  onClick={() => {
                    setDraft(
                      (previous) =>
                        previous && {
                          ...previous,
                          bannerWinner: pokemonLabel(entry.pokemon),
                          bannerEnabled: true,
                        },
                    );
                    setMessage(
                      `${pokemonLabel(entry.pokemon)} selected. Click “Save poll & banner” to publish the winner.`,
                    );
                  }}
                >
                  Use in banner
                </button>
              </form>
            ))}
          {!data.entries.length && (
            <p>
              No nominations yet. Visitors can submit any Pokémon, or you can
              add one above.
            </p>
          )}
        </div>
      </section>
      <section className="shop-panel shop-form">
        <h3>A fresh page in the sketchbook</h3>
        <p>
          Start a new poll with an empty leaderboard. Previous counts are
          archived and each email’s seven-day cooldown still applies. The banner
          stays as you saved it.
        </p>
        {!confirmRound ? (
          <button
            type="button"
            className="shop-button shop-secondary"
            disabled={disabled}
            onClick={() => setConfirmRound(true)}
          >
            Start a fresh poll…
          </button>
        ) : (
          <div className="shop-row">
            <strong>Archive poll {data.round} and start again?</strong>
            <button
              type="button"
              className="shop-button"
              disabled={disabled}
              onClick={() => {
                void action(async () => {
                  await api("poll/new-round", {
                    method: "POST",
                    body: JSON.stringify({ round: data.round }),
                  });
                  setConfirmRound(false);
                }, "Fresh poll started. Previous results archived.");
              }}
            >
              Yes, start fresh
            </button>
            <button
              type="button"
              className="shop-link-button"
              disabled={disabled}
              onClick={() => setConfirmRound(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
