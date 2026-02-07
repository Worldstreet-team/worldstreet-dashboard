import { CustomizerContext } from "@/app/context/customizerContext";
import { useAuth } from "@/app/context/authContext";
import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useContext } from "react";
import SimpleBar from "simplebar-react";
import * as profileData from "./Data";
import Link from "next/link";

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
      {/* Drawer (Sliding Panel) */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity ${isDrawerOpen ? "opacity-40" : "opacity-0 pointer-events-none"
          }`}
        onClick={toggleDrawer}
      ></div>

      <div
        className={`fixed opacity-0 right-0 profile-drawer top-0 w-72 h-full bg-white dark:bg-black z-50 shadow-lg transition-transform transform ${isDrawerOpen
          ? "translate-x-0 rtl:-translate-x-0 opacity-100"
          : "translate-x-full rtl:-translate-x-full"
          }`}
      >
        <div className="px-6 py-6">
          <div className="">
            <h3 className="text-lg font-semibold text-ld">User Profile</h3>
            <div className="flex items-center gap-6 pb-5 border-b border-gray-950/10 dark:border-darkborder mt-5 mb-3">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                {initials}
              </div>
              <div>
                <h5 className="card-title text-sm mb-0.5 font-medium">
                  {displayName}
                </h5>
                <span className="card-subtitle text-muted font-normal">
                  {displayRole}
                </span>
                <p className="card-subtitle font-normal text-muted mb-0 mt-1 flex items-center">
                  <Icon
                    icon="tabler:mail"
                    className="text-base me-1 relative top-0.5"
                  />
                  {displayEmail}
                </p>
              </div>
            </div>
          </div>
        </div>

        <SimpleBar style={{ maxHeight: "calc(100vh - 250px)" }}>
          {profileData.profileDD.map((items, index) => (
            <Link key={index} href={items.url} passHref>
              <div className="px-6 py-3 flex justify-between items-center bg-hover group/link w-full cursor-pointer">
                <div className="flex items-center w-full">
                  <div
                    className={`h-11 w-11 shrink-0 rounded-md flex justify-center items-center text-primary bg-primary/20`}
                  >
                    <Icon icon={items.img} width={30} />
                  </div>
                  <div className="ps-4 flex justify-between w-full">
                    <div className="w-3/4">
                      <h5 className="mb-1 text-sm  group-hover/link:text-primary">
                        {items.title}
                      </h5>
                      <div className="text-xs text-darklink">
                        {items.subtitle}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </SimpleBar>

        <div className="pt-2 px-6 pb-6 space-y-2">
          <button
            type="button"
            className="inline-block text-center py-2 text-sm font-medium rounded-md w-full text-white bg-red-500 hover:bg-red-600 border-2 border-red-500 hover:border-red-600 cursor-pointer"
            onClick={() => { toggleDrawer(); logout(); }}
          >
            Sign Out
          </button>
          <button
            type="button"
            className="inline-block text-center py-2 text-sm font-medium rounded-md w-full text-primary bg-transparent hover:bg-primary/10 border-2 border-primary cursor-pointer"
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
