"use client";
import React, { useContext } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./layout/vertical/sidebar/Sidebar";
import Header from "./layout/vertical/header/Header";
import { Customizer } from "./layout/shared/customizer/Customizer";
import { CustomizerContext } from "@/app/context/customizerContext";
import ProfileDrawer from "./layout/vertical/header/ProfileDrawer";
import { ThemeModeScript, ThemeProvider } from 'flowbite-react';
import customTheme from "@/utils/theme/custom-theme";
import { AuthProvider, useAuth } from "@/app/context/authContext";
import { ProfileProvider } from "@/app/context/profileContext";
import { WalletProvider } from "@/app/context/walletContext";
import { SolanaProvider } from "@/app/context/solanaContext";
import { EvmProvider } from "@/app/context/evmContext";
import { BitcoinProvider } from "@/app/context/bitcoinContext";
import { SwapProvider } from "@/app/context/swapContext";

import { PinSetupModal, WalletAddressSync } from "@/components/wallet";
import DashboardVividProvider from "@/components/dashboard/DashboardVividProvider";

// Routes that render full-screen without sidebar/header chrome
const FULLSCREEN_ROUTES = ["/vivid"];

const LOGIN_URL = "https://www.worldstreetgold.com/login";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted text-sm">Verifying identity...</p>
        </div>
      </div>
    );
  }

  // Clerk finished loading but no valid session → redirect to login
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = LOGIN_URL;
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto mb-4"></div>
          <p className="text-muted text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { activeLayout, isLayout } = useContext(CustomizerContext);
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <>
      <ThemeModeScript />
      <ThemeProvider theme={customTheme}>
        <ProfileProvider>
          <AuthProvider>
            <AuthGate>
              <WalletProvider>
                <SolanaProvider>
                  <EvmProvider>
                    <BitcoinProvider>
                      <SwapProvider>

                        {/* Syncs wallet addresses to chain contexts */}
                        <WalletAddressSync />
                        <DashboardVividProvider>
                          <div className="flex w-full h-screen overflow-hidden">
                            <div className="page-wrapper flex w-full h-full">
                              {/* Header/sidebar */}
                              {activeLayout == "vertical" ? <Sidebar /> : null}
                              <div className="body-wrapper w-full h-full flex flex-col overflow-hidden">
                                {/* Top Header  */}
                                {activeLayout == "horizontal" ? (
                                  <Header layoutType="horizontal" />
                                ) : (
                                  <Header layoutType="vertical" />
                                )}

                                {/* Body Content - Scrollable */}
                                <div className="relative z-0 flex-1 bg-herobg dark:bg-dark transition-colors duration-300 overflow-y-auto overflow-x-hidden">
                                  {/* Subtle ambient glow */}
                                  <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                                  <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-warning/3 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                                  <div
                                    className={`relative z-1 ${isLayout == "full"
                                      ? "w-full p-6 lg:p-8"
                                      : "container xl:max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8"
                                      } ${activeLayout == "horizontal" ? "xl:mt-3" : ""}
            `}
                                  >
                                    <div className="animate-fade-in">
                                      {children}
                                    </div>
                                  </div>
                                </div>
                                <Customizer />
                                <ProfileDrawer />
                              </div>
                            </div>
                          </div>
                          )}
                          {/* Wallet PIN Setup Modal */}
                          <PinSetupModal />
                        </DashboardVividProvider>

                      </SwapProvider>
                    </BitcoinProvider>
                  </EvmProvider>
                </SolanaProvider>
              </WalletProvider>
            </AuthGate>
          </AuthProvider>
        </ProfileProvider>
      </ThemeProvider>
    </>
  );
}
