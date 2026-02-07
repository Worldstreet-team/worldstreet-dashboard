"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { CustomizerContext } from "@/app/context/customizerContext";

const Profile = () => {

  const { isDrawerOpen, setIsDrawerOpen } = useContext(CustomizerContext);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const userName = "Trader";

  return (
    <div className="relative z-3">
      {/* Trigger Button to open the drawer */}
      <div
        onClick={toggleDrawer}
        className="hover:text-primary rounded-md p-1 flex group justify-center items-center gap-2 cursor-pointer"
      >
        <Image
          src="/images/profile/user-1.jpg"
          alt="logo"
          height="35"
          width="35"
          className="rounded-full"
        />
        <div className="">
          <h5 className="text-black dark:text-white text-sm group-hover:text-primary">{userName}</h5>
          <p className="text-black opacity-60 dark:text-white dark:opacity-40 text-xs">
            Trader
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
