import { z } from "zod";
import species from "./pokemon.json" with { type: "json" };

export const pokemonNames = species;
export function pokemonLabel(name: string) {
  const special: Record<string, string> = {
    "nidoran-f": "Nidoran ♀",
    "nidoran-m": "Nidoran ♂",
    "mr-mime": "Mr. Mime",
    "mime-jr": "Mime Jr.",
    "mr-rime": "Mr. Rime",
    "type-null": "Type: Null",
    "ho-oh": "Ho-Oh",
    "porygon-z": "Porygon-Z",
    "jangmo-o": "Jangmo-o",
    "hakamo-o": "Hakamo-o",
    "kommo-o": "Kommo-o",
    farfetchd: "Farfetch’d",
    sirfetchd: "Sirfetch’d",
    flabebe: "Flabébé",
  };
  return (
    special[name] ||
    name
      .split("-")
      .map((s) => s[0]?.toUpperCase() + s.slice(1))
      .join(" ")
  );
}
function key(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}
export function canonicalPokemon(value: string) {
  return species.find((name) => key(name) === key(value));
}
const pokemon = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) => canonicalPokemon(value) || "")
  .refine(Boolean, "Choose a Pokémon species from the suggestions.");
export const voteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .max(254)
    .pipe(z.email())
    .transform((v) => v.toLowerCase()),
  pokemon,
  website: z.string().max(0).optional().default(""),
});
export const pollSettingsSchema = z.object({
  enabled: z.boolean(),
  open: z.boolean(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  bannerEnabled: z.boolean(),
  bannerTitle: z.string().trim().min(1).max(120),
  bannerText: z.string().trim().max(600),
  bannerWinner: z.string().trim().max(80),
  bannerImage: z
    .string()
    .regex(
      /^(?:|\/(?:artworks\/[a-zA-Z0-9._-]+\.(?:webp|png|jpg|jpeg)|api\/shop\/images\/[a-f0-9-]+\.(?:webp|png|jpg)))$/,
    ),
  bannerImageAlt: z.string().trim().max(180),
});
export const pollEntrySchema = z.object({
  round: z.number().int().min(1),
  pokemon,
  votes: z.number().int().min(0).max(1000000),
});
export type PollSettings = z.infer<typeof pollSettingsSchema>;
export type PollEntry = {
  pokemon: string;
  votes: number;
  actual_votes?: number;
  adjustment?: number;
};
export type PollData = {
  settings: PollSettings;
  round: number;
  entries: PollEntry[];
  total: number;
};
