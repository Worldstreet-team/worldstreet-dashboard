"use client";

import React from "react";
import AdminSidebarContent from "./AdminSidebarItems";
import AdminNavItem from "./AdminNavItem";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";

const AdminSidebar = () => {
  return (
    <div className="xl:block hidden">
      <aside
        className="fixed menu-sidebar bg-white dark:bg-black border-r border-border dark:border-darkborder"
        data-sidebar-type="full-sidebar"
        aria-label="Admin sidebar navigation"
      >
        {/* Logo + Admin Badge */}
        <div className="h-16 flex items-center px-6 border-b border-border dark:border-darkborder">
          <Link href="/admin" className="brand-logo flex items-center gap-2.5">
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
            <span className="hide-menu px-1.5 py-0.5 rounded bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          </Link>
        </div>

        {/* Scrollable Navigation */}
        <div className="overflow-y-auto" style={{ height: "calc(100vh - 4rem)" }}>
          <nav className="sidebar-nav py-3 px-4">
            <ul className="sidebar-nav-group space-y-0.5">
              {AdminSidebarContent.map((item, index) => (
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
                      <AdminNavItem item={child} />
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </ul>
          </nav>

          {/* Back to Dashboard link */}
          <div className="px-4 pb-6 mt-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors duration-200 text-sm"
            >
              <Icon icon="ph:arrow-left-duotone" height={18} />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AdminSidebar;
