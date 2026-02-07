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

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Verifying identity...</p>
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
        <AuthProvider>
          <AuthGate>
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
              <div className="relative z-0 overflow-hidden after:absolute after:w-96 after:h-96 after:opacity-25 before:opacity-25 after:-top-52 after:-right-52 after:bg-primary after:blur-[250px] after:rounded-full after:-z-1 before:absolute before:w-96 before:h-96 before:bg-warning before:blur-[200px] before:rounded-full before:-bottom-52 before:-left-52 min-h-screen bg-herobg dark:bg-dark ">
                <div
                  className={` ${isLayout == "full"
                    ? "w-full p-8"
                    : "container xl:max-w-7xl mx-auto px-8 py-8"
                    } ${activeLayout == "horizontal" ? "xl:mt-3" : ""}
            `}
                >
                  {children}
                </div>
              </div>
              <Customizer />
              <ProfileDrawer />
            </div>
          </div>
        </div>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}
