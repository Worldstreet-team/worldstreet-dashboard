"use client"
import { Navbar, Button, NavbarToggle, NavbarCollapse, NavbarLink } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";

const CTANav = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Navbar With CTA Button</h4>
          <CodeModal>
            {`
      import { Navbar, Button, NavbarToggle, NavbarCollapse, NavbarLink } from "flowbite-react";
      
      <Navbar fluid className="rounded-md">
        <FullLogo/>
          <div className="flex md:order-2">
            <Button color="primary">Get started</Button>
            <NavbarToggle />
          </div>
          <NavbarCollapse className="overflow-x-auto">
            <NavbarLink href="#" active className="text-primary">
              Home
            </NavbarLink>
            <NavbarLink href="#">About</NavbarLink>
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
          <div className="flex md:order-2">
            <Button color="primary" className="me-1">
              Get started
            </Button>
            <NavbarToggle />
          </div>
          <NavbarCollapse className="overflow-x-auto">
            <NavbarLink href="#" active className="text-primary">
              Home
            </NavbarLink>
            <NavbarLink href="#">About</NavbarLink>
            <NavbarLink href="#">Services</NavbarLink>
            <NavbarLink href="#">Pricing</NavbarLink>
            <NavbarLink href="#">Contact</NavbarLink>
          </NavbarCollapse>
        </Navbar>
      </CardBox>
    </div>
  );
};

export default CTANav;
