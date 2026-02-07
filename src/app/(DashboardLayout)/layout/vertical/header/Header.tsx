"use client";
import React, { useState, useEffect, useContext } from "react";
import { Navbar, NavbarCollapse, Drawer, DrawerItems, Tooltip } from "flowbite-react";
import Search from "./Search";
import { Icon } from "@iconify/react";
import AppLinks from "./AppLinks";
import Messages from "./Messages";
import Profile from "./Profile";
import { CustomizerContext } from "@/app/context/customizerContext";
import { Language } from "./Language";
import MobileHeaderItems from "./MobileHeaderItems";
import MobileSidebar from "../sidebar/MobileSidebar";
import HorizontalMenu from "../../horizontal/header/HorizontalMenu";
import Image from "next/image";
import Link from "next/link";
interface HeaderPropsType {
  layoutType: string;
}

const Header = ({ layoutType }: HeaderPropsType) => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const { setIsCollapse, isCollapse, isLayout, setActiveMode, activeMode } =
    useContext(CustomizerContext);

  const [mobileMenu, setMobileMenu] = useState("");

  const handleMobileMenu = () => {
    if (mobileMenu === "active") {
      setMobileMenu("");
    } else {
      setMobileMenu("active");
    }
  };

  const toggleMode = () => {
    setActiveMode((prevMode: string) =>
      prevMode === "light" ? "dark" : "light"
    );
  };

  // mobile-sidebar
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => setIsOpen(false);
  return (
    <>
      <header
        className={`sticky top-0 z-1 ${isSticky ? " shadow-md bg-white dark:bg-black! fixed w-full" : "bg-white dark:bg-black!"
          }`}
      >
        <Navbar
          fluid
          className={`rounded-none bg-transparent dark:bg-transparent py-4 sm:px-6 ${layoutType == "horizontal" ? "container mx-auto" : ""
            }  ${isLayout == "full" ? "max-w-full!" : ""}`}
        >
          {/* Mobile Toggle Icon */}
          <div className=" block! xl:hidden!">
            <span
              onClick={() => setIsOpen(true)}
              className="px-3 hover:text-primary dark:hover:text-primary text-link dark:text-darklink relative rounded-full xl:hidden flex justify-center items-center cursor-pointer"
            >
              <Icon icon="tabler:menu-2" height={20} />
            </span>
          </div>
          {/* Toggle Icon   */}

          <NavbarCollapse className="xl:block! hidden!">
            <div className="flex gap-3 items-center relative">
              {/* Toggle Menu */}
              {layoutType != "horizontal" ? (
                <span
                  onClick={() => {
                    if (isCollapse === "full-sidebar") {
                      setIsCollapse("mini-sidebar");
                    } else {
                      setIsCollapse("full-sidebar");
                    }
                  }}
                  className="px-3 relative after:absolute after:w-10 after:h-10 after:rounded-full hover:after:bg-primary/20 after:bg-transparent text-link hover:text-primary dark:text-darklink dark:hover:text-primary rounded-full flex justify-center items-center cursor-pointer"
                >
                  <Icon icon="tabler:menu-2" height={20} />
                </span>
              ) : null}

              <Search />
            </div>
          </NavbarCollapse>

          <NavbarCollapse className="lg:block! hidden!">
            <div className="flex gap-5 items-center">
              <div className="flex gap-3 items-center pr-3 border-r border-gray-950/10 dark:border-darkborder">
                {/* Theme Toggle */}
                {activeMode === "light" ? (
                  <div
                    className=" hover:text-primary group w-10 h-10 hover:bg-primary/20 dark:hover:text-primary focus:ring-0 rounded-full flex justify-center items-center cursor-pointer text-link dark:text-darklink relative"
                    onClick={toggleMode}
                  >
                    <span className="flex items-center justify-center relative">
                      <Icon
                        icon="tabler:moon"
                        width="20"
                      // className="text-link group-hover:text-primary"
                      />
                    </span>
                  </div>
                ) : (
                  // Dark Mode Button
                  <div
                    className=" hover:text-primary w-10 h-10 hover:bg-primary/20 dark:hover:text-primary focus:ring-0 rounded-full flex justify-center items-center cursor-pointer text-link dark:text-darklink group relative"
                    onClick={toggleMode}
                  >
                    <span className="flex items-center justify-center relative">
                      <Icon
                        icon="solar:sun-bold-duotone"
                        width="20"
                        className="group-hover:text-primary"
                      />
                    </span>
                  </div>
                )}

                {/* Language Dropdown*/}
                <Language />

                {/* Messages Dropdown */}
                <Messages />

                {/* App Link Dropwown   */}
                <AppLinks />
              </div>

              {/* Profile Dropdown */}
              <Profile />
            </div>
          </NavbarCollapse>
          {/* Mobile Toggle Icon */}
          <span
            className="h-10 w-10 flex lg:hidden hover:text-primary hover:bg-primary/20 rounded-full justify-center items-center cursor-pointer"
            onClick={handleMobileMenu}
          >
            <Icon icon="tabler:dots" height={21} />
          </span>
        </Navbar>
        <div className={`w-full xl:hidden block mobile-header-menu ${mobileMenu}`}>
          <MobileHeaderItems />
        </div>

        {/* Horizontal Menu  */}
        {layoutType == "horizontal" ? (
          <div className="xl:border-y xl:border-gray-950/10 dark:border-darkborder">
            <div
              className={`${isLayout == "full" ? "w-full px-6" : "container mx-auto px-8"}`}
            >
              <HorizontalMenu />
            </div>
          </div>
        ) : null}
      </header>
      <Drawer open={isOpen} onClose={handleClose} className="w-[270px]">
        <DrawerItems>
          <MobileSidebar handleClose={function (): void {
            throw new Error("Function not implemented.");
          }} />
        </DrawerItems>
        <DrawerItems>
          <div
            className={` my-4 mx-6 bg-linear-to-br from-darkcyan to-cyan rounded-md ${isCollapse === "full-sidebar" ? "" : "hidden"
              }`}
          >
            <div
              className={` pt-4 pb-5 bg-[url('/images/backgrounds/sidebar-card-bg.png')] bg-no-repeat bg-right-top ${isCollapse === "full-sidebar" ? "px-4" : "px-2"
                }`}
            >
              <div>
                <div>
                  <Image
                    src="/images/svgs/icon-rocket.svg"
                    alt="rocket"
                    width={40}
                    height={40}
                    className=""
                  />
                  <div className="mt-4">
                    <p className="text-sm font-medium text-white">
                      Get unlimited access and 10% off on your first purchase
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="text-white border-2 rounded-md px-3 py-2 hover:text-black hover:bg-white text-sm font-medium"
                  >
                    Buy Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </DrawerItems>
      </Drawer>
    </>
  );
};

export default Header;
