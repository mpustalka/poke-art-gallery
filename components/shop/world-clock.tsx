"use client";

import { useEffect, useState } from "react";

const timeZones = [
  { label: "Los Angeles", value: "America/Los_Angeles" },
  { label: "New York", value: "America/New_York" },
  { label: "London", value: "Europe/London" },
  { label: "Tokyo", value: "Asia/Tokyo" },
  { label: "UTC", value: "UTC" },
];

function formatClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function WorldClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="border-b-4 border-ink bg-[#1a2c48] py-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border-2 border-ink bg-poke-yellow px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
              Global time
            </span>
          </div>
          <p className="text-sm text-cream/70">Live across key regions</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {timeZones.map((zone) => (
            <div
              key={zone.value}
              className="rounded-2xl border-4 border-ink bg-[#243b66] p-4 shadow-[4px_4px_0_var(--color-ink)]"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-poke-yellow">
                {zone.label}
              </p>
              <div className="font-display text-2xl text-cream sm:text-3xl">
                {formatClock(now, zone.value)}
              </div>
              <p className="mt-2 text-sm text-cream/70">
                {formatDate(now, zone.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
