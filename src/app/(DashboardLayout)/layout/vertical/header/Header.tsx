"use client";
import React, { useState, useEffect, useContext } from "react";
import { Icon } from "@iconify/react";
import Profile from "./Profile";
import { CustomizerContext } from "@/app/context/customizerContext";
import MobileSidebar from "../sidebar/MobileSidebar";
import HorizontalMenu from "../../horizontal/header/HorizontalMenu";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeaderPropsType {
  layoutType: string;
}

const Header = ({ layoutType }: HeaderPropsType) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) { setIsSticky(true); } else { setIsSticky(false); }
    };
    window.addEventListener("scroll", handleScroll);
    return () => { window.removeEventListener("scroll", handleScroll); };
  }, []);

  const { setIsCollapse, isCollapse, isLayout, setActiveMode, activeMode } = useContext(CustomizerContext);
  const toggleMode = () => {
    setActiveMode((prevMode: string) => prevMode === "light" ? "dark" : "light");
  };

  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => setIsOpen(false);

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
        <div
          className={cn(
            "flex items-center justify-between h-16 px-6",
            layoutType === "horizontal" ? "container mx-auto" : "",
            isLayout === "full" ? "max-w-full!" : ""
          )}
        >
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

            {/* Desktop sidebar toggle */}
            {layoutType !== "horizontal" && (
              <button
                onClick={() => {
                  if (isCollapse === "full-sidebar") { setIsCollapse("mini-sidebar"); }
                  else { setIsCollapse("full-sidebar"); }
                }}
                className="hidden xl:flex items-center justify-center w-9 h-9 rounded-lg text-link dark:text-darklink hover:text-primary hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <Icon icon="tabler:menu-2" height={20} />
              </button>
            )}

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
                icon={activeMode === "light" ? "tabler:moon" : "solar:sun-bold-duotone"}
                width={20}
              />
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-border dark:bg-darkborder mx-2" />

            <Profile />
          </div>

        </div>

        {/* Horizontal menu */}
        {layoutType === "horizontal" && (
          <div className="xl:border-y xl:border-border dark:border-darkborder">
            <div className={`${isLayout === "full" ? "w-full px-6" : "container mx-auto px-8"}`}>
              <HorizontalMenu />
            </div>
          </div>
        )}
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
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-error hover:bg-error/10 transition-colors duration-200 z-10 cursor-pointer"
          aria-label="Close sidebar"
        >
          <Icon icon="tabler:x" height={18} />
        </button>
        <MobileSidebar handleClose={handleClose} />
      </div>
    </>
  );
};

export default Header;
