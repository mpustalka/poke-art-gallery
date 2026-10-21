import { CatalogProvider } from "@/components/shop/catalog";
import Storefront from "@/components/shop/storefront";
export const metadata = {
  title: "Your Order | Poke Print Shop",
  robots: { index: false, follow: false },
};
export default function OrderPage() {
  return (
    <CatalogProvider>
      <header className="shop-custom-header">
        <a href="/">← Poke Print Shop</a>
        <a href="/#contact">Contact Us</a>
      </header>
      <main>
        <Storefront checkoutOnly />
      </main>
    </CatalogProvider>
  );
}
