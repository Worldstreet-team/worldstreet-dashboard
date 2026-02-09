"use client";
import { Icon } from "@iconify/react";
import Image from "next/image";
import React, { useState } from "react";
import * as AppsData from "./Data";
import Link from "next/link";
import { IconHelp } from "@tabler/icons-react";
import { Button, Drawer } from "flowbite-react";
import SimpleBar from "simplebar-react";

const AppMenuContent = () => (
  <div className="grid grid-cols-12 w-full">
    <div className="col-span-12 flex items-stretch px-5 py-5">
      <div className="grid grid-cols-12 gap-3 w-full">
        {AppsData.appsLink.map((links, index) => (
          <div className="col-span-12 xl:col-span-6 flex items-stretch" key={index}>
              <Link
                href={links.href}
                className="flex gap-3 items-center group relative"
              >
                <span className="bg-primary/20 h-10 w-10 flex justify-center items-center rounded-md">
                  <Image src={links.avatar} width={20} height={20} alt={links.title} />
                </span>
                <div>
                  <h6 className="font-semibold text-sm text-ld group-hover:text-primary mb-1">
                    {links.title}
                  </h6>
                  <p className="text-xs text-link/90 dark:text-darklink font-medium">
                    {links.subtext}
                  </p>
                </div>
              </Link>
          </div>
        ))}
        {/* FAQ section - only on desktop */}
        <div className="col-span-12 md:col-span-12 border-t border-border dark:border-darkborder hidden xl:flex items-stretch pt-4 pr-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center text-dark dark:text-darklink">
              <i className="ti ti-help text-lg"></i>
              <Link
                href={"#"}
                className="text-sm font-semibold hover:text-primary ml-2 flex gap-2 items-center"
              >
                <IconHelp width={20} />
                Frequently Asked Questions
              </Link>
            </div>
            <Button className="bg-primary cursor-pointer hover:bg-primary/80">Check</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AppLinks = () => {
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => setIsOpen(false);

  return (
    <div className="relative group">
      {/* Desktop Icon (hover dropdown) */}
      <div className="rounded-full h-10 w-10 hover:bg-primary/20 text-link dark:text-darklink relative pb-0.5 justify-center items-center cursor-pointer hover:text-primary xl:flex hidden">
        <Icon icon="ph:squares-four-duotone" height={24} />
      </div>

      {/* Mobile Icon (click to open drawer) */}
      <span
        className="xl:hidden text-link dark:text-darklink flex rounded-full px-[15px] pb-0.5 justify-center items-center cursor-pointer hover:text-primary"
        onClick={() => setIsOpen(true)}
      >
        <Icon icon="tabler:apps" className="shrink-0" height={20} />
      </span>

      {/* Desktop Hover Dropdown Menu */}
      <div className="hidden xl:block">
        <div className="sm:w-[800px] w-screen dropdown top-9 right-0 invisible z-50 group-hover:visible absolute mega-dropdown">
          <div className="relative p-0 overflow-hidden xl:h-auto xl:w-full w-64 bg-white dark:bg-dark surface shadow-xl rounded-lg before:absolute before:w-32 before:h-32 before:bg-primary before:rounded-full before:-z-1 before:blur-[80px] before:-right-10 before:-top-10 before:opacity-30 after:opacity-30 after:absolute after:w-32 after:h-32 after:bg-warning after:rounded-full after:-z-1 after:blur-[80px] after:-bottom-10 after:-left-10">
            <SimpleBar className="h-auto max-h-[80vh]">
              <AppMenuContent />
            </SimpleBar>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (click) */}
      <div className="xl:hidden">
        <Drawer
          open={isOpen}
          onClose={handleClose}
          position="right"
          className="p-0 overflow-hidden h-full w-full sm:w-80 before:absolute before:w-32 before:h-32 before:bg-primary before:rounded-full before:-z-1 before:blur-[80px] before:-right-10 before:-top-10 before:opacity-30 after:opacity-30 after:absolute after:w-32 after:h-32 after:bg-warning after:rounded-full after:-z-1 after:blur-[80px] after:-bottom-10 after:-left-10"
        >
          <span onClick={() => setIsOpen(false)} className="hover:text-primary cursor-pointer inline-block w-fit">
            <Icon icon="tabler:x" width={24} height={24} />
          </span>
          <SimpleBar className="h-full max-h-[calc(100vh-50px)] overflow-y-auto">
            <AppMenuContent />
          </SimpleBar>
        </Drawer>
      </div>
    </div>
  );
};

export default AppLinks;
