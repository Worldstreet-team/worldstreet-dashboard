"use client";
import React from "react";
import { ChildItem } from "../Sidebaritems";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavItemsProps {
  item: ChildItem;
  handleClose?: () => void;
}

const NavItems: React.FC<NavItemsProps> = ({ item, handleClose }) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isActive = pathname === item.url;

  const handleClick = () => {
    if (!item.disabled && handleClose) {
      handleClose();
    }
  };

  return (
    <Link
      href={item.disabled ? "#" : item.url}
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
            className={`${item.color || ""} my-0.5 shrink-0 transition-colors`}
            height={20}
          />
        ) : (
          <span
            className="h-1.5 w-1.5 bg-muted dark:bg-darklink rounded-full mx-1.5 group-hover/link:bg-primary transition-colors"
          />
        )}
        <div className="max-w-36 overflow-hidden hide-menu flex-1">
          <span className="text-sm">{t(`${item.name}`)}</span>
          {item.subtitle ? (
            <p className="text-[10px] text-muted mt-0.5">{t(`${item.subtitle}`)}</p>
          ) : null}
        </div>
        {item.badge ? (
          item.badgeType === "filled" ? (
            <span className="w-5 h-5 rounded-full bg-primary font-semibold text-white text-[10px] flex items-center justify-center sidebar-badge">
              9
            </span>
          ) : (
            <span className="px-1.5 py-0.5 border-primary/50 border rounded-full bg-transparent text-primary font-medium text-[10px] sidebar-badge">
              New
            </span>
          )
        ) : null}
      </span>
    </Link>
  );
};

export default NavItems;
