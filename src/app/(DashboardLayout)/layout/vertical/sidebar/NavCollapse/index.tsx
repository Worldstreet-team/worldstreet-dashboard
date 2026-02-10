"use client";
import React, { useState } from "react";
import { ChildItem } from "../Sidebaritems";
import NavItems from "../NavItems";
import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavCollapseProps {
  item: ChildItem;
}

const NavCollapse: React.FC<NavCollapseProps> = ({ item }) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const activeDD = item.children?.find((child) => child.url === pathname);
  const [isOpen, setIsOpen] = useState(!!activeDD);

  return (
    <div className="collapse-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
          "text-link dark:text-darklink hover:text-primary hover:bg-lightprimary dark:hover:text-primary",
          activeDD && "text-primary bg-lightprimary"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon icon={item.icon} height={20} className="shrink-0 my-0.5" />
          <span className="collapse-label truncate max-w-[8rem] hide-menu">
            {t(`${item.name}`)}
          </span>
        </span>
        <Icon
          icon="tabler:chevron-down"
          className={cn(
            "drop-icon h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <ul className="sidebar-dropdown pl-4 space-y-0.5 pt-1">
            {item.children?.map((child) => (
              <li key={child.id}>
                {child.children ? (
                  <NavCollapse item={child} />
                ) : (
                  <NavItems item={child} />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NavCollapse;
