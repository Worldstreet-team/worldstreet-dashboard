"use client";
import React from "react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import SimpleBar from "simplebar-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/context/authContext";
import { useContext } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";

const MobileSidebar = ({ handleClose }: { handleClose: () => void }) => {
  const { logout } = useAuth();
  const { setActiveMode, activeMode } = useContext(CustomizerContext);
  const toggleMode = () => {
    setActiveMode((prevMode: string) => prevMode === "light" ? "dark" : "light");
  };

  return (
    <aside className="bg-white dark:bg-black w-full h-full flex flex-col" aria-label="Mobile sidebar navigation">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border dark:border-darkborder flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={handleClose}>
          <Image
            src="/worldstreet-logo/WorldStreet4x.png"
            alt="WorldStreet"
            width={28}
            height={28}
          />
          <span className="text-base font-semibold text-dark dark:text-white tracking-tight">
            WorldStreet
          </span>
        </Link>
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <SimpleBar style={{ height: '100%' }} autoHide={false}>
          <nav className="sidebar-nav px-4 py-3">
            <ul className="sidebar-nav-group space-y-0.5">
              {SidebarContent.map((item, index) => (
                <React.Fragment key={index}>
                  <li>
                    <h5 className="text-muted dark:text-darklink font-semibold text-[10px] uppercase tracking-widest border-t border-border dark:border-darkborder caption px-3 pt-[18px] mt-4 mb-0.5">
                      <span>{item.heading}</span>
                    </h5>
                  </li>
                  {item.children?.map((child, idx) => (
                    <li key={child.id || idx}>
                      {child.children ? (
                        <div className="collapse-items">
                          <NavCollapse item={child} />
                        </div>
                      ) : (
                        <NavItems item={child} handleClose={handleClose} />
                      )}
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ul>
          </nav>
        </SimpleBar>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t border-border dark:border-darkborder p-4 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleMode}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-link dark:text-darklink hover:text-primary hover:bg-primary/10 transition-colors duration-200"
        >
          <Icon
            icon={activeMode === "light" ? "tabler:moon" : "solar:sun-bold-duotone"}
            className="h-5 w-5"
          />
          <span className="text-sm font-medium">
            {activeMode === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>
        {/* Logout */}
        <button
          onClick={() => { handleClose(); logout(); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-error hover:bg-error/10 transition-colors duration-200"
        >
          <Icon icon="ph:sign-out-duotone" className="h-5 w-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default MobileSidebar;
