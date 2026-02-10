"use client";
import { CustomizerContext } from "@/app/context/customizerContext";
import { useAuth } from "@/app/context/authContext";
import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useContext } from "react";
import SimpleBar from "simplebar-react";
import * as profileData from "./Data";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ProfileDrawer = () => {
  const { isDrawerOpen, setIsDrawerOpen } = useContext(CustomizerContext);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const { user, logout } = useAuth();

  const displayName = user ? `${user.firstName} ${user.lastName}` : "Trader";
  const displayEmail = user?.email || "trader@example.com";
  const displayRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Trader";
  const initials = user
    ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase()
    : "T";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleDrawer}
      />

      {/* Drawer Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 w-72 h-full bg-white dark:bg-black z-50 shadow-2xl transition-all duration-300 ease-in-out",
          isDrawerOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0"
        )}
      >
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-dark dark:text-white">Profile</h3>
            <button
              onClick={toggleDrawer}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-dark dark:hover:text-white hover:bg-muted/20 transition-colors cursor-pointer"
            >
              <Icon icon="tabler:x" height={18} />
            </button>
          </div>
          <div className="flex items-center gap-4 pb-5 border-b border-border dark:border-darkborder">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h5 className="text-sm font-semibold text-dark dark:text-white truncate">
                {displayName}
              </h5>
              <span className="text-xs text-muted block">{displayRole}</span>
              <p className="text-xs text-muted mt-1 flex items-center gap-1 truncate">
                <Icon icon="tabler:mail" className="text-xs shrink-0" />
                {displayEmail}
              </p>
            </div>
          </div>
        </div>

        <SimpleBar style={{ maxHeight: "calc(100vh - 280px)" }}>
          <div className="px-3">
            {profileData.profileDD.map((items, index) => (
              <Link key={index} href={items.url} passHref>
                <div className="px-3 py-3 flex items-center gap-3 rounded-lg hover:bg-muted/30 dark:hover:bg-white/5 transition-colors duration-200 group cursor-pointer">
                  <div className="h-10 w-10 shrink-0 rounded-lg flex justify-center items-center text-primary bg-primary/10">
                    <Icon icon={items.img} width={24} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-medium text-dark dark:text-white group-hover:text-primary transition-colors">
                      {items.title}
                    </h5>
                    <p className="text-xs text-muted truncate">{items.subtitle}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SimpleBar>

        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 bg-white dark:bg-black border-t border-border dark:border-darkborder">
          <button
            type="button"
            className="w-full py-2.5 text-sm font-medium rounded-lg text-white bg-error hover:bg-error/90 transition-colors duration-200 cursor-pointer"
            onClick={() => { toggleDrawer(); logout(); }}
          >
            Sign Out
          </button>
          <button
            type="button"
            className="w-full py-2.5 text-sm font-medium rounded-lg text-dark dark:text-white bg-transparent hover:bg-muted/30 dark:hover:bg-white/5 border border-border dark:border-darkborder transition-colors duration-200 cursor-pointer"
            onClick={toggleDrawer}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default ProfileDrawer;
