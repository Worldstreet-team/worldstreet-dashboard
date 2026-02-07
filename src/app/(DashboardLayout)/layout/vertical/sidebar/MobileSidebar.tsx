"use client";
import React, { useContext } from "react";
import { Sidebar, SidebarItemGroup, SidebarItems, Tooltip } from "flowbite-react";
import SidebarContent from "./Sidebaritems";
import NavItems from "./NavItems";
import NavCollapse from "./NavCollapse";
import { CustomizerContext } from "@/app/context/customizerContext";
import SimpleBar from "simplebar-react";
import { Icon } from "@iconify/react";
import Image from "next/image";

const MobileSidebar = ({ handleClose }: { handleClose: () => void }) => {
  const { selectedIconId } = useContext(CustomizerContext) || {};
  const selectedContent = SidebarContent.find((data) => data.id === selectedIconId);

  return (
    <>
      <Sidebar className="menu-sidebar static! pt-0 bg-white dark:bg-dark z-10 overflow-hidden" aria-label="Sidebar with multi-level dropdown example">
        <SimpleBar className="h-[calc(100vh_-_80px)]">
          <SidebarItems className="px-6">
            <SidebarItemGroup className="sidebar-nav">
              {SidebarContent.map((item, index) => (
                <React.Fragment key={index}>
                  <h5 className="text-link font-bold text-xs dark:text-darklink border-t border-gray-950/10 dark:border-darkborder caption">
                    <span className="hide-menu leading-21">{item.heading?.toUpperCase()}</span>
                    <Icon icon="tabler:dots" className="text-ld block mx-auto leading-6 dark:text-opacity-60 hide-icon" height={18} />
                  </h5>
                  {item.children?.map((child, index) => (
                    <React.Fragment key={child.id || index}>
                      {child.children ? (
                        <div className="collpase-items">
                          <NavCollapse item={child} />
                        </div>
                      ) : (
                        <NavItems item={child} handleClose={handleClose} />
                      )}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </SidebarItemGroup>
          </SidebarItems>
        </SimpleBar>
      </Sidebar>
    </>
  );
};

export default MobileSidebar;