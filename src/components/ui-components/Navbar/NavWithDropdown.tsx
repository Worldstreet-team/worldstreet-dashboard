"use client"
import { Navbar, Dropdown, Avatar, DropdownDivider, DropdownHeader, DropdownItem, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";

const NavWithDropdown = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Navbar With Dropdown</h4>
          <CodeModal>
            {`
      import { Navbar, Dropdown, Avatar, DropdownDivider, DropdownHeader, DropdownItem, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
      
      <Navbar fluid className="rounded-md">
          <FullLogo />
          <div className="flex md:order-2">
            <Dropdown
              arrowIcon={false}
              inline
              label={
                <Avatar
                  alt="User settings"
                  img={user}
                  rounded
                />
              }
            >
              <DropdownHeader>
                <span className="block text-sm">Bonnie Green</span>
                <span className="block truncate text-sm font-medium">
                  info@matdash.com
                </span>
              </DropdownHeader>
              <DropdownItem>Dashboard</DropdownItem>
              <DropdownItem>Settings</DropdownItem>
              <DropdownItem>Earnings</DropdownItem>
              <DropdownDivider />
              <DropdownItem>Sign out</DropdownItem>
            </Dropdown>
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
            <Dropdown
              arrowIcon={false}
              inline
              label={
                <Avatar
                  alt="User settings"
                  img="/images/profile/user-2.jpg"
                  rounded
                />
              }
            >
              <DropdownHeader>
                <span className="block text-sm">Bonnie Green</span>
                <span className="block truncate text-sm font-medium">
                  info@matdash.com
                </span>
              </DropdownHeader>
              <DropdownItem>Dashboard</DropdownItem>
              <DropdownItem>Settings</DropdownItem>
              <DropdownItem>Earnings</DropdownItem>
              <DropdownDivider />
              <DropdownItem>Sign out</DropdownItem>
            </Dropdown>
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

export default NavWithDropdown;
