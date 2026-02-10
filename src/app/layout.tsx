import React from "react";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./css/globals.css";
import { ThemeModeScript } from "flowbite-react";
import customTheme from "@/utils/theme/custom-theme";
import { CustomizerContextProvider } from "@/app/context/customizerContext";
import "../utils/i18n";
import NextTopLoader from "nextjs-toploader";
const font = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "WorldStreet - Trading Platform",
  description: "Trade Forex and Crypto with confidence",
  icons: {
    icon: "/worldstreet-logo/WorldStreet4x.png",
    shortcut: "/worldstreet-logo/WorldStreet4x.png",
    apple: "/worldstreet-logo/WorldStreet4x.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body className={`${font.className}`}>
        <NextTopLoader color="var(--color-primary)" />
        <CustomizerContextProvider>
          {children}
        </CustomizerContextProvider>
      </body>
    </html>
  );
}