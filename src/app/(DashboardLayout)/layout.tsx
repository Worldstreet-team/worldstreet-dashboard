"use client";
import React, { useContext } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/app/context/authContext";
import { ProfileProvider } from "@/app/context/profileContext";
import { WalletProvider } from "@/app/context/walletContext";
import { SolanaProvider } from "@/app/context/solanaContext";
import { EvmProvider } from "@/app/context/evmContext";
import { SuiProvider } from "@/app/context/suiContext";
import { TonProvider } from "@/app/context/tonContext";
import { TronProvider } from "@/app/context/tronContext";
import { SwapProvider } from "@/app/context/swapContext";
import { HyperliquidProvider } from "@/app/context/hyperliquidContext";
import { WalletGenerationModal } from "@/components/privy/WalletGenerationModal";

import DashboardVividProvider from "@/components/dashboard/DashboardVividProvider";
import { LayoutShell } from "@/components/layout/layout-shell";

// Routes that render full-screen without sidebar/header chrome
const FULLSCREEN_ROUTES = ["/vivid", "/spot", "/futures", "/portfolio"];

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
  return (
    <>
        <ProfileProvider>
          <AuthProvider>
            <AuthGate>
              <WalletProvider>
                <SolanaProvider>
                  <EvmProvider>
                    <SuiProvider>
                      <TonProvider>
                        <TronProvider>
                          <HyperliquidProvider>
                            <SwapProvider>
                              {/* Show modal while wallets are being checked/generated */}
                              <WalletGenerationModal />

                              <DashboardVividProvider>
                                <LayoutShell>
                                  {children}
                                </LayoutShell>
                              </DashboardVividProvider>
                            </SwapProvider>
                          </HyperliquidProvider>
                        </TronProvider>
                      </TonProvider>
                    </SuiProvider>
                  </EvmProvider>
                </SolanaProvider>
              </WalletProvider>
            </AuthGate>
          </AuthProvider>
        </ProfileProvider>
    </>
  );
}
