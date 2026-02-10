"use client";
import React, { useContext } from "react";
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
import { PinSetupModal } from "@/components/wallet";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

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

  return <>{children}</>;
}

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { activeLayout, isLayout } = useContext(CustomizerContext);
  return (
    <>
      <ThemeModeScript />
      <ThemeProvider theme={customTheme}>
        <ProfileProvider>
        <AuthProvider>
          <AuthGate>
            <WalletProvider>
        <div className="flex w-full min-h-screen">
          <div className="page-wrapper flex w-full">
            {/* Header/sidebar */}
            {activeLayout == "vertical" ? <Sidebar /> : null}
            <div className="body-wrapper w-full ">
              {/* Top Header  */}
              {activeLayout == "horizontal" ? (
                <Header layoutType="horizontal" />
              ) : (
                <Header layoutType="vertical" />
              )}

              {/* Body Content  */}
              <div className="relative z-0 min-h-screen bg-herobg dark:bg-dark transition-colors duration-300">
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
        {/* Wallet PIN Setup Modal */}
        <PinSetupModal />
            </WalletProvider>
          </AuthGate>
        </AuthProvider>
        </ProfileProvider>
      </ThemeProvider>
    </>
  );
}
