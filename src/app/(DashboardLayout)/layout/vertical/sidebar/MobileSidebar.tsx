"use client";
import React, { useContext } from "react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import { CustomizerContext } from "@/app/context/customizerContext";
import SimpleBar from "simplebar-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/context/authContext";

const MobileSidebar = ({ handleClose }: { handleClose: () => void }) => {
  const { logout } = useAuth();

  return (
    <aside className="bg-white dark:bg-black w-full h-full flex flex-col" aria-label="Mobile sidebar navigation">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border dark:border-darkborder shrink-0">
        <Link href="/" className="flex items-center gap-2.5" onClick={handleClose}>
          <Image
            src="/worldstreet-logo/WorldStreet4x.png"
            alt="WorldStreet"
            width={28}
            height={28}
            className="shrink-0"
          />
          <span className="text-base font-semibold text-dark dark:text-white tracking-tight">
            WorldStreet
          </span>
        </Link>
      </div>
      <SimpleBar className="flex-1 min-h-0">
        <nav className="sidebar-nav px-4 py-3">
          <ul className="sidebar-nav-group space-y-0.5">
            {SidebarContent.map((item, index) => (
              <React.Fragment key={index}>
                <li>
                  <h5 className="text-muted dark:text-darklink font-semibold text-[10px] uppercase tracking-widest border-t border-border dark:border-darkborder caption px-3">
                    <span className="leading-21">{item.heading}</span>
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
      {/* Logout Button */}
      <div className="shrink-0 border-t border-border dark:border-darkborder p-4">
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
