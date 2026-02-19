import React from "react";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./css/globals.css";
import { ThemeModeScript } from "flowbite-react";
import { CustomizerContextProvider } from "@/app/context/customizerContext";
import "../utils/i18n";
import NextTopLoader from "nextjs-toploader";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
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
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body className={`${font.className}`}>
        <ClerkProvider
          {...(isProduction
            ? {
                domain: "worldstreetgold.com",
                isSatellite: true,
                signInUrl: "https://www.worldstreetgold.com/login",
              }
            : {})}
        >
          <NextTopLoader color="var(--color-primary)" />
          <CustomizerContextProvider>
            <Providers>
              {children}
            </Providers>
          </CustomizerContextProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}