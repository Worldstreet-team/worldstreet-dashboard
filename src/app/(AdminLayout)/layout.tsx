"use client";
import React from "react";
import AdminSidebar from "./layout/sidebar/AdminSidebar";
import AdminHeader from "./layout/header/AdminHeader";
import AdminGate from "./layout/AdminGate";
import { ThemeModeScript, ThemeProvider } from "flowbite-react";
import customTheme from "@/utils/theme/custom-theme";
import { AuthProvider, useAuth } from "@/app/context/authContext";
import { ProfileProvider } from "@/app/context/profileContext";

const LOGIN_URL = "https://www.worldstreetgold.com/login";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto mb-4" />
          <p className="text-muted text-sm">Verifying identity...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = LOGIN_URL;
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary mx-auto mb-4" />
          <p className="text-muted text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ThemeModeScript />
      <ThemeProvider theme={customTheme}>
        <ProfileProvider>
          <AuthProvider>
            <AuthGate>
              <AdminGate>
                <div className="flex w-full h-screen overflow-hidden">
                  <div className="page-wrapper flex w-full h-full">
                    {/* Admin Sidebar */}
                    <AdminSidebar />

                    <div className="body-wrapper w-full h-full flex flex-col overflow-hidden">
                      {/* Admin Header */}
                      <AdminHeader />

                      {/* Body Content - Scrollable */}
                      <div className="relative z-0 flex-1 bg-herobg dark:bg-dark transition-colors duration-300 overflow-y-auto overflow-x-hidden">
                        {/* Subtle ambient glow */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-error/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-warning/3 blur-[100px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                        <div className="relative z-1 container xl:max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
                          <div className="animate-fade-in">{children}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AdminGate>
            </AuthGate>
          </AuthProvider>
        </ProfileProvider>
      </ThemeProvider>
    </>
  );
}
