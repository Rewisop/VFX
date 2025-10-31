import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

import SiteNav from "@/components/SiteNav";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AimShreem Flex Lab",
  description: "Funky neon playground for AimShreem Flex visuals and motion previews",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#0d0063]">
      <body className={`${spaceGrotesk.className} min-h-screen antialiased`}>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
