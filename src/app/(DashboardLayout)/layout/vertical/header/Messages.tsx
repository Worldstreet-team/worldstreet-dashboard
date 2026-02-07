import { Icon } from "@iconify/react";
import Link from "next/link";
import * as MessagesData from "./Data";
import React from "react";
import Image from "next/image";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Badge, Button, Dropdown, DropdownItem } from "flowbite-react";

const Messages = () => {
  return (
    <div className="relative group/menu">
      <Dropdown
        label=""
        className="w-screen sm:w-[360px] py-6 relative overflow-hidden rounded-sm before:absolute before:w-28 before:h-28 before:bg-primary before:rounded-full before:-z-1 before:blur-[80px] before:-right-10 before:-top-10 before:opacity-30 after:opacity-30 after:absolute after:w-28 after:h-28 after:bg-warning after:rounded-full after:-z-1 after:blur-[80px] after:-bottom-10 after:-left-10"
        dismissOnClick={false}
        renderTrigger={() => (
          <div className="relative w-10 h-10 group-hover/menu:bg-primary/20 flex items-center justify-center rounded-full">
            <span className="relative text-link dark:text-darklink rounded-full flex justify-center items-center cursor-pointer group-hover/menu:after:bg-primary/20 group-hover/menu:text-primary">
              <Icon icon="tabler:bell-ringing" height={20} />
            </span>
            <span className="rounded-full absolute -end-[0px] top-1 text-[10px] h-2 w-2 bg-primary flex justify-center items-center"></span>
          </div>
        )}
      >
        <div className="flex items-center  px-6 justify-between">
          <h3 className="mb-0 text-lg font-semibold text-ld">Notification</h3>
          <Badge color={"secondary"}>5 new</Badge>
        </div>
        <SimpleBar className="max-h-80 mt-3">
          {MessagesData.MessagesLink.map((links, index) => (
            <DropdownItem
              as={Link}
              href="#"
              className="px-6 py-3 flex justify-between items-center bg-hover group/link w-full"
              key={index}
            >
              <div className="flex items-center">
                <span className="shrink-0 relative">
                  <Image
                    src={links.avatar}
                    width={45}
                    height={45}
                    alt="WorldStreet"
                    className="rounded-full"
                  />
                </span>
                <div className="ps-4">
                  <h5 className="mb-1 text-sm  group-hover/link:text-primary">
                    {links.title}
                  </h5>
                  <span className="text-xs block  truncate text-darklink">
                    {links.subtitle}
                  </span>
                </div>
              </div>
            </DropdownItem>
          ))}
        </SimpleBar>
        <div className="pt-5 px-6">
          <Button
            color={"primary"}
            className="w-full border border-primary text-primary hover:bg-primary hover:text-white rounded-md"
            pill
            outline
          >
            See All Notifications
          </Button>
        </div>
      </Dropdown>
    </div>
  );
};

export default Messages;
