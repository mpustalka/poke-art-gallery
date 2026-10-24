import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Radio, Trophy, Vote } from "lucide-react";
import { api } from "@/lib/commerce";
import {
  leaderboardPokemonEntries,
  pokemonLabel,
  pokemonNames,
} from "@/lib/poll";
import type { PollData } from "@/lib/poll";

export function PokemonSuggestions({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {pokemonNames.map((name) => (
        <option key={name} value={pokemonLabel(name)} />
      ))}
    </datalist>
  );
}

export default function PollSection() {
  const [data, setData] = useState<PollData | null>(null);
  const [error, setError] = useState("");
  const [voteError, setVoteError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    let running = false;
    const controller = new AbortController();

    async function load() {
      if (!active || running) return;
      running = true;
      try {
        const next = await api<PollData>("poll", { signal: controller.signal });
        if (active) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (active && (e as Error).name !== "AbortError") {
          setError("Results are reconnecting. Please try again shortly.");
        }
      } finally {
        running = false;
      }
    }

    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 10000);

    const onVisible = () => {
      if (!document.hidden) void load();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  if (!data)
    return (
      <section
        id="poll"
        className="shop-section poll-loading"
        aria-busy={!error}
        aria-label="Pokémon poll"
      >
        <div className="shop-wrap">
          {error ? (
            <p role="status">
              {error}{" "}
              <button
                className="shop-link-button"
                onClick={() => setRefresh((n) => n + 1)}
              >
                Retry
              </button>
            </p>
          ) : (
            <>
              <div className="poll-skeleton" />
              <p>Opening the sketchbook poll…</p>
            </>
          )}
        </div>
      </section>
    );

  const { settings: s } = data;
  const leaderboard = leaderboardPokemonEntries(data.entries);
  const leaders = leaderboard.filter((entry) => entry.votes === leaderboard[0]?.votes);

  return (
    <>
      {s.bannerEnabled && (
        <section
          className="poll-announcement"
          aria-labelledby="next-print-title"
        >
          <div className="shop-wrap poll-announcement-inner">
            {s.bannerImage ? (
              <img
                className="poll-preview"
                src={s.bannerImage}
                alt={s.bannerImageAlt || "Next print in progress"}
              />
            ) : (
              <div
                className="poll-preview poll-preview-placeholder"
                aria-hidden="true"
              >
                <Trophy size={42} />
              </div>
            )}
            <div className="poll-announcement-copy">
              <span className="poll-overline">
                From the studio / next encounter
              </span>
              <h2 id="next-print-title">{s.bannerTitle}</h2>
              {s.bannerWinner && (
                <p className="poll-winner">
                  This week’s poll winner is… <strong>{s.bannerWinner}!</strong>
                </p>
              )}
              <p className="shop-preserve">{s.bannerText}</p>
            </div>
            {s.enabled && (
              <a href="#poll" className="poll-announcement-link">
                Pick the next one <ArrowUpRight size={20} aria-hidden="true" />
              </a>
            )}
          </div>
        </section>
      )}

      {s.enabled && (
        <section
          id="poll"
          className="shop-section poll-section"
          aria-labelledby="poll-title"
        >
          <div className="shop-wrap poll-console">
            <div className="poll-console-top">
              <span className="poll-indicator" aria-hidden="true" />
              <span>Sketchbook / community choice</span>
              <span className="poll-round">
                Poll {String(data.round).padStart(2, "0")}
              </span>
            </div>

            <div className="poll-grid">
              <div className="poll-invite">
                <span className="shop-eyebrow">
                  Your next encounter starts here
                </span>
                <h2 id="poll-title">{s.title}</h2>
                <p>{s.description}</p>
                <div className="poll-ball" aria-hidden="true">
                  <span />
                </div>
                <span className="poll-stamp">
                  You choose.
                  <br />I draw.
                </span>
                <a href="#cast-vote" className="poll-jump">
                  Make your pick <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>

              <div className="poll-screen">
                <div className="poll-results-heading">
                  <h3>
                    <Trophy size={19} aria-hidden="true" /> The leading five
                  </h3>
                  <span className="poll-live">
                    <Radio size={14} aria-hidden="true" />
                    {error
                      ? "Reconnecting"
                      : s.open
                        ? "Live results"
                        : "Voting closed"}
                  </span>
                </div>

                <p className="poll-total">
                  {data.total.toLocaleString()} {data.total === 1 ? "vote" : "votes"} on the board {" "}
                  <span>• Refreshes every 10s</span>
                </p>

                {leaderboard.length ? (
                  <>
                    {leaders.length > 1 && (
                      <div className="poll-leader-tie" aria-live="polite">
                        <span className="poll-leader-tie-label">Tie at the top</span>
                        <strong>{leaders.map((entry) => entry.label).join(" · ")}</strong>
                      </div>
                    )}

                    <ol className="poll-leaderboard" aria-label="Top five Pokémon">
                      {leaderboard.map((entry, index) => {
                        const percent = data.total
                          ? Math.round((entry.votes / data.total) * 100)
                          : 0;
                        const tied =
                          entry.votes > 0 &&
                          data.entries.some(
                            (other) =>
                              other.pokemon !== entry.pokemon &&
                              other.votes === entry.votes,
                          );
                        const isLeader = entry.votes === leaderboard[0]?.votes;

                        return (
                          <li
                            key={entry.pokemon}
                            className={isLeader ? "poll-first" : ""}
                          >
                            <span className="poll-rank">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="poll-sprite-wrap">
                              <img
                                className={`poll-sprite ${isLeader ? "poll-sprite-leader" : ""}`}
                                src={entry.sprite}
                                alt={entry.label}
                                loading="lazy"
                              />
                              {isLeader && <span className="poll-crown">1st</span>}
                            </div>
                            <div className="poll-contender">
                              <div>
                                <strong>{entry.label}</strong>
                                <small>
                                  {entry.votes.toLocaleString()} {entry.votes === 1 ? "vote" : "votes"}
                                  {tied ? " · tied" : ""}
                                </small>
                              </div>
                              <div
                                className="poll-track"
                                role="meter"
                                aria-label={`${entry.label} share of all votes`}
                                aria-valuenow={percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <span
                                  style={{
                                    transform: `scaleX(${percent / 100})`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="poll-percent">{percent}%</span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                ) : (
                  <div className="poll-empty">
                    <Vote size={36} aria-hidden="true" />
                    <h4>A fresh page. A new Pokémon.</h4>
                    <p>No votes yet. Your favourite could take the lead.</p>
                  </div>
                )}

                <p className="poll-footnote">
                  Any Pokémon can enter. Only the top five appear here. Ties
                  share a vote count.
                </p>

                {error && (
                  <p role="status" className="shop-error">
                    {error} Showing the last received results.
                  </p>
                )}
              </div>
            </div>

            <div className="poll-vote-deck" id="cast-vote">
              <div>
                <span className="poll-overline">Trainer’s choice</span>
                <h3>
                  {s.open
                    ? "One vote. Make it count."
                    : "The sketchbook is taking a break."}
                </h3>
                <p>No account needed. One vote per email every seven days.</p>
              </div>

              {s.open ? (
                <form
                  className="shop-form poll-vote-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const values = Object.fromEntries(new FormData(form));
                    setBusy(true);
                    setVoteError("");
                    setMessage("");
                    try {
                      const result = await api<{ nextVoteAt: string }>(
                        "poll/vote",
                        { method: "POST", body: JSON.stringify(values) },
                      );
                      setMessage(
                        `Vote caught! You can vote again on ${new Date(result.nextVoteAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.`,
                      );
                      form.reset();
                      setRefresh((n) => n + 1);
                    } catch (e) {
                      setVoteError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <fieldset disabled={busy} className="poll-vote-fields">
                    <legend className="sr-only">Cast your Pokémon vote</legend>
                    <label>
                      Your name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        autoComplete="name"
                        placeholder="Trainer name"
                      />
                    </label>
                    <label>
                      Email address
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Pokémon name
                      <input
                        name="pokemon"
                        list="poll-pokemon"
                        required
                        maxLength={80}
                        autoComplete="off"
                        placeholder="Choose your favourite…"
                      />
                    </label>
                    <div className="shop-trap" aria-hidden="true">
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                    <button className="shop-button" disabled={busy}>
                      <Vote size={18} aria-hidden="true" />
                      {busy ? "Catching vote…" : "Cast my vote"}
                    </button>
                  </fieldset>
                  <PokemonSuggestions id="poll-pokemon" />
                  <p className="poll-privacy">
                    Your name and email stay private and are used to manage
                    voting. Voting does not subscribe you to emails.
                  </p>
                  {voteError && (
                    <p role="alert" className="shop-error shop-notice">
                      {voteError}
                    </p>
                  )}
                  {message && (
                    <p role="status" className="shop-success shop-notice">
                      <Check size={18} aria-hidden="true" /> {message}
                    </p>
                  )}
                </form>
              ) : (
                <p className="poll-closed">
                  Results are still here. Check back for the next chance to
                  choose.
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
