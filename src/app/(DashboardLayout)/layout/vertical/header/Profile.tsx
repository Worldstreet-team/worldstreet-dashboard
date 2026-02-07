"use client";

import React, { useContext } from "react";
import Image from "next/image";
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
      {/* Trigger Button to open the drawer */}
      <div
        onClick={toggleDrawer}
        className="hover:text-primary rounded-md p-1 flex group justify-center items-center gap-2 cursor-pointer"
      >
        <div className="h-[35px] w-[35px] rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
          {user ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase() : "T"}
        </div>
        <div className="">
          <h5 className="text-black dark:text-white text-sm group-hover:text-primary">{userName}</h5>
          <p className="text-black opacity-60 dark:text-white dark:opacity-40 text-xs">
            {userRole}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
