"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/commerce";
import type { Catalog } from "@/lib/commerce";
const Context = createContext<{
  data: Catalog | null;
  error: string;
  reload: () => Promise<void>;
}>({ data: null, error: "", reload: async () => {} });
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Catalog | null>(null),
    [error, setError] = useState("");
  async function reload() {
    setError("");
    try {
      setData(await api<Catalog>("catalog"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <Context.Provider value={{ data, error, reload }}>
      {children}
    </Context.Provider>
  );
}
export const useCatalog = () => useContext(Context);
export function HeroImage({ custom = false }: { custom?: boolean }) {
  const { data } = useCatalog();
  const fallback = custom
    ? "/artworks/dragonite-Sn7h0GV1MXBn84XEEQX3qfq5abhEFS.webp"
    : "/artworks/scyther-lWQ0foeiGwRy5hvTppqIaSfUmw6HqS.webp";
  return (
    <img
      className="shop-hero-image"
      src={
        (custom ? data?.settings.customHeroImage : data?.settings.heroImage) ||
        fallback
      }
      alt={
        custom
          ? "Custom Pokémon artwork inspiration"
          : data?.settings.heroAlt || "Featured Pokémon artwork"
      }
      fetchPriority="high"
    />
  );
}
