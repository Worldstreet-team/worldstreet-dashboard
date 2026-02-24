"use client";

import React, { useContext } from "react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import SimpleBar from "simplebar-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { CustomizerContext } from "@/app/context/customizerContext";
import Link from "next/link";

const SidebarLayout = () => {
  const { isCollapse } = useContext(CustomizerContext);
  return (
    <>
      <div className="xl:block hidden">
        <aside
          className="fixed menu-sidebar flex flex-col bg-white dark:bg-black border-r border-border dark:border-darkborder"
          data-sidebar-type={isCollapse}
          aria-label="Sidebar navigation"
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border dark:border-darkborder flex-shrink-0">
            <Link href="/" className="brand-logo flex items-center gap-2.5">
              <Image
                src="/worldstreet-logo/WorldStreet4x.png"
                alt="WorldStreet"
                width={28}
                height={28}
                className="shrink-0"
              />
              <span className="hide-menu text-base font-semibold text-dark dark:text-white tracking-tight">
                WorldStreet
              </span>
            </Link>
          </div>
          
          {/* Scrollable Navigation */}
          <div className="flex-1 overflow-hidden">
            <SimpleBar style={{ height: '100%' }} autoHide={false}>
              <nav className={`sidebar-nav py-3 ${isCollapse === "full-sidebar" ? "px-4" : "px-3"}`}>
                <ul className="sidebar-nav-group space-y-0.5">
                  {SidebarContent.map((item, index) => (
                    <React.Fragment key={index}>
                      <li>
                        <h5 className="text-muted dark:text-darklink font-semibold text-[10px] uppercase tracking-widest border-t border-border dark:border-darkborder caption px-3 pt-[18px] mt-4 mb-0.5">
                          <span className="hide-menu">{item.heading}</span>
                          <Icon
                            icon="tabler:dots"
                            className="text-ld block mx-auto leading-6 dark:text-opacity-60 hide-icon"
                            height={18}
                          />
                        </h5>
                      </li>
                      {item.children?.map((child, idx) => (
                        <li key={child.id || idx}>
                          {child.children ? (
                            <div className="collapse-items">
                              <NavCollapse item={child} />
                            </div>
                          ) : (
                            <NavItems item={child} />
                          )}
                        </li>
                      ))}
                    </React.Fragment>
                  ))}
                </ul>
              </nav>
            </SimpleBar>
          </div>
        </aside>
      </div>
    </>
  );
};

export default SidebarLayout;