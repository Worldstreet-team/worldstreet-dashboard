"use client";

import React, { useContext } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";
import { useAuth } from "@/app/context/authContext";

const Profile = () => {
  const { isDrawerOpen, setIsDrawerOpen } = useContext(CustomizerContext);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);
  const { user } = useAuth();

  const userName = user ? `${user.firstName} ${user.lastName}` : "Trader";
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Trader";

  return (
    <div className="relative z-3">
      <button
        onClick={toggleDrawer}
        className="flex items-center gap-2.5 rounded-lg py-1.5 px-2 hover:bg-muted/30 dark:hover:bg-white/5 transition-colors duration-200 group cursor-pointer"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
          {user ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase() : "T"}
        </div>
        <div className="text-left hidden xl:block">
          <h5 className="text-sm font-medium text-dark dark:text-white group-hover:text-primary transition-colors leading-tight">
            {userName}
          </h5>
          <p className="text-[11px] text-muted leading-tight">{userRole}</p>
        </div>
      </button>
    </div>
  );
};

export default Profile;
