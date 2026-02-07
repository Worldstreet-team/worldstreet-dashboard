"use client";

import React, { useContext } from "react";
import { Sidebar, SidebarItemGroup, SidebarItems, Tooltip } from "flowbite-react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import SimpleBar from "simplebar-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { CustomizerContext } from "@/app/context/customizerContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SidebarLayout = () => {
  const { isCollapse } = useContext(CustomizerContext);
  const router = useRouter();
  return (
    <>
      <div className="xl:block hidden">
        <div className="flex">
          <Sidebar
            className="fixed menu-sidebar bg-white dark:bg-black border-r border-gray-950/10 dark:border-darkborder"
            aria-label="Sidebar with multi-level dropdown example"
          >

            <SimpleBar
              className={`${isCollapse === "full-sidebar"
                ? "h-[calc(100vh_-_80px)] px-6"
                : "h-[calc(100vh_-_75px)]"
                } `}
            >
              <SidebarItems
                className={`${isCollapse === "full-sidebar" ? "" : "px-5"}`}
              >
                <SidebarItemGroup >
                  {SidebarContent.map((item, index) => (
                    <React.Fragment key={index}>
                      <h5 className="text-link font-bold text-xs dark:text-darklink border-t border-gray-950/10 dark:border-darkborder caption">
                        <span className="hide-menu leading-21">
                          {item.heading?.toUpperCase()}
                        </span>
                        <Icon
                          icon="tabler:dots"
                          className="text-ld block mx-auto leading-6 dark:text-opacity-60 hide-icon"
                          height={18}
                        />
                      </h5>

                      {item.children?.map((child, index) => (
                        <React.Fragment key={child.id && index}>
                          {child.children ? (
                            <div className="collpase-items">
                              <NavCollapse item={child} />
                            </div>
                          ) : (
                            <NavItems item={child} />
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </SidebarItemGroup>
              </SidebarItems>
            </SimpleBar>
          </Sidebar>
        </div>
      </div>
    </>
  );
};

export default SidebarLayout;
