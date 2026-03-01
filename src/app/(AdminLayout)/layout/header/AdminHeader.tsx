"use client";
import React, { useState, useEffect, useContext } from "react";
import { Icon } from "@iconify/react";
import { CustomizerContext } from "@/app/context/customizerContext";
import AdminMobileSidebar from "../sidebar/AdminMobileSidebar";
import { useAuth } from "@/app/context/authContext";
import { cn } from "@/lib/utils";

const AdminHeader = () => {
  const [isSticky, setIsSticky] = useState(false);
  const { setActiveMode, activeMode } = useContext(CustomizerContext);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMode = () => {
    setActiveMode((prevMode: string) =>
      prevMode === "light" ? "dark" : "light"
    );
  };

  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => setIsOpen(false);

  const userName = user
    ? `${user.firstName} ${user.lastName}`
    : "Admin";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-10 transition-all duration-300 shrink-0",
          isSticky
            ? "shadow-sm bg-white/95 dark:bg-black/95 backdrop-blur-md"
            : "bg-white dark:bg-black"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6">
          {/* Left section */}
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsOpen(true)}
              className="xl:hidden flex items-center justify-center w-9 h-9 rounded-lg text-link dark:text-darklink hover:text-primary hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
              aria-label="Open sidebar"
            >
              <Icon icon="tabler:menu-2" height={20} />
            </button>

            {/* Admin breadcrumb label */}
            <div className="hidden xl:flex items-center gap-2 text-sm text-muted">
              <Icon icon="ph:shield-check-duotone" height={18} className="text-error" />
              <span className="font-medium text-dark dark:text-white">Admin Panel</span>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleMode}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-link dark:text-darklink hover:text-primary hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
              aria-label="Toggle theme"
            >
              <Icon
                icon={
                  activeMode === "light"
                    ? "tabler:moon"
                    : "solar:sun-bold-duotone"
                }
                width={20}
              />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-border dark:bg-darkborder mx-2" />

            {/* Admin Profile */}
            <div className="flex items-center gap-2.5 rounded-lg py-1.5 px-2">
              <div className="h-8 w-8 rounded-lg bg-error/10 flex items-center justify-center text-error font-semibold text-xs">
                {user
                  ? user.firstName.charAt(0).toUpperCase() +
                    user.lastName.charAt(0).toUpperCase()
                  : "A"}
              </div>
              <div className="text-left hidden xl:block">
                <h5 className="text-sm font-medium text-dark dark:text-white leading-tight">
                  {userName}
                </h5>
                <p className="text-[11px] text-error leading-tight font-medium">
                  Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 xl:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Mobile Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[280px] bg-white dark:bg-black z-50 shadow-xl transition-transform duration-300 ease-in-out xl:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-colors duration-200 z-10 cursor-pointer"
          aria-label="Close sidebar"
        >
          <Icon icon="tabler:x" height={18} />
        </button>
        <AdminMobileSidebar handleClose={handleClose} />
      </div>
    </>
  );
};

export default AdminHeader;
