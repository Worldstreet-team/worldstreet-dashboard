"use client";
import React from "react";
import { AdminChildItem } from "./AdminSidebarItems";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminNavItemProps {
  item: AdminChildItem;
  handleClose?: () => void;
}

const AdminNavItem: React.FC<AdminNavItemProps> = ({ item, handleClose }) => {
  const pathname = usePathname();

  // Exact match for /admin, startsWith for sub-pages
  const isActive =
    item.url === "/admin"
      ? pathname === "/admin"
      : item.url
        ? pathname.startsWith(item.url)
        : false;

  const handleClick = () => {
    if (!item.disabled && handleClose) {
      handleClose();
    }
  };

  return (
    <Link
      href={item.disabled ? "#" : (item.url || "#")}
      onClick={handleClick}
      className={cn(
        "nav-item-link group/link",
        item.disabled && "opacity-40 cursor-default pointer-events-none",
        isActive && "active !text-primary !bg-lightprimary"
      )}
    >
      <span className="flex gap-3 items-center truncate w-full">
        {item.icon ? (
          <Icon
            icon={item.icon}
            className="my-0.5 shrink-0 transition-colors"
            height={20}
          />
        ) : (
          <span className="h-1.5 w-1.5 bg-muted dark:bg-darklink rounded-full mx-1.5 group-hover/link:bg-primary transition-colors" />
        )}
        <div className="max-w-36 overflow-hidden hide-menu flex-1">
          <span className="text-sm">{item.name}</span>
          {item.subtitle ? (
            <p className="text-[10px] text-muted mt-0.5">{item.subtitle}</p>
          ) : null}
        </div>
        {item.badge ? (
          <span className="px-1.5 py-0.5 border-primary/50 border rounded-full bg-transparent text-primary font-medium text-[10px] sidebar-badge">
            {item.badgeText || "New"}
          </span>
        ) : null}
      </span>
    </Link>
  );
};

export default AdminNavItem;
