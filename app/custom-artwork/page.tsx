import { CatalogProvider } from "@/components/shop/catalog";
import CustomArtwork from "@/components/shop/custom-artwork";
export const metadata = {
  title: "Custom Pokémon Artwork | Poke Print Shop",
  description:
    "Commission a custom Pokémon drawing. Choose your Pokémon, theme, color, print size, framing, and delivery.",
};
export default function CustomArtworkPage() {
  return (
    <CatalogProvider>
      <CustomArtwork />
    </CatalogProvider>
  );
}
