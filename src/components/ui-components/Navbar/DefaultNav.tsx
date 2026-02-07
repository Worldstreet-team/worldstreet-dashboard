"use client"

import { Navbar, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";
import Link from "next/link";

const DefaultNav = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default Navbar</h4>
          <CodeModal>
            {`
       import {Navbar, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
      
       <Navbar fluid className="rounded-md">
          <FullLogo />
          <NavbarToggle />
          <NavbarCollapse className="overflow-x-auto">
            <NavbarLink href="#" active>
              Home
            </NavbarLink>
            <NavbarLink as={Link} href="#">
              About
            </NavbarLink>
            <NavbarLink href="#">Services</NavbarLink>
            <NavbarLink href="#">Pricing</NavbarLink>
            <NavbarLink href="#">Contact</NavbarLink>
          </NavbarCollapse>
        </Navbar>
                `}
          </CodeModal>
        </div>

        <Navbar fluid className="rounded-md">
          <FullLogo />
          <NavbarToggle />
          <NavbarCollapse className="overflow-x-auto">
            <NavbarLink href="#" active >
              Home
            </NavbarLink>
            <NavbarLink as={Link} href="#">
              About
            </NavbarLink>
            <NavbarLink href="#">Services</NavbarLink>
            <NavbarLink href="#">Pricing</NavbarLink>
            <NavbarLink href="#">Contact</NavbarLink>
          </NavbarCollapse>
        </Navbar>
      </CardBox>
    </div>
  );
};

export default DefaultNav;
