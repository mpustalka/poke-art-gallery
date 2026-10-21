import AuthRedirect from "@/components/shop/auth-redirect";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./shop.css";

export const metadata: Metadata = {
  title: "Poke Print Shop | Pokemon Fan Art Prints & Frames",
  description:
    "Handmade Pokemon-inspired art prints, wooden prints, matted frames, and posters. Sizes from 4 x 4 to 20 x 30.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#e3350d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark BfK3mq_variable cl9swW_variable">
      <body className="bg-background font-sans text-foreground antialiased">
        <AuthRedirect />
        {children}
      </body>
    </html>
  );
}
