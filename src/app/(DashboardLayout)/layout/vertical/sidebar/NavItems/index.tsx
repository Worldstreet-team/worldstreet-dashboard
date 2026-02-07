"use client";
import React from "react";
import { ChildItem } from "../Sidebaritems";
import { SidebarItem } from "flowbite-react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

interface NavItemsProps {
  item: ChildItem;
  handleClose?: () => void; // 🆕 Optional handleClose
}

const NavItems: React.FC<NavItemsProps> = ({ item, handleClose }) => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const handleClick = () => {
    if (!item.disabled && handleClose) {
      handleClose();
    }
  };

  return (
    <SidebarItem
      href={item.url}
      as={Link}
      onClick={handleClick} // 🆕 Trigger close on click
      className={`${item.disabled
          ? "text-link/50 cursor-default hover:bg-transparent hover:text-link"
          : "text-link bg-transparent group/link hover:text-primary hover:bg-lightprimary dark:hover:text-primary"
        }`}
    >
      <span className="flex gap-3.5 align-center items-center truncate">
        {item.icon ? (
          <Icon
            icon={item.icon}
            className={`${item.color} my-0.5`}
            height={21}
          />
        ) : (
          <span
            className="h-[6px] w-[6px] bg-darklink dark:bg-white rounded-full mx-1.5 group-hover/link:bg-primary"
          ></span>
        )}
        <div className="max-w-36 overflow-hidden hide-menu flex-1">
          {t(`${item.name}`)}
          {item.subtitle ? (
            <p className="text-xs mt-1">{t(`${item.subtitle}`)}</p>
          ) : null}
        </div>
        {item.badge ? (
          item.badgeType === "filled" ? (
            <span className="w-6 h-6 rounded-full bg-primary font-semibold text-white text-xs flex items-center justify-center sidebar-badge">
              9
            </span>
          ) : (
            <span className="px-2 py-1 border-primary border rounded-full  bg-transparent text-primary font-semibold text-xs sidebar-badge">
              Outline
            </span>
          )
        ) : null}
      </span>
    </SidebarItem>
  );
};

export default NavItems;
