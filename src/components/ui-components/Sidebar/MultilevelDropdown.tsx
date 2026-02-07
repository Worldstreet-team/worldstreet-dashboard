"use client"
import {
  IconLayoutDashboard,
  IconBrandShopee,
  IconInbox,
  IconUser,
  IconShoppingBag,
  IconLogin2,
  IconUserPlus,
} from "@tabler/icons-react";
import { Sidebar, SidebarCollapse, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const MultilevelDropdown = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Multi-level dropdown</h4>
          <CodeModal>
            {`
    import { Sidebar, SidebarCollapse, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
    import { IconBrandShopee, IconBrandTrello, IconFileText, IconInbox, IconInfoSquareRounded, IconLayoutDashboard, IconLogin2, IconShoppingBag, IconUser, IconUserPlus, IconWorldUpload } from "@tabler/icons-react";

    <Sidebar aria-label="Sidebar with multi-level dropdown example">
      <SidebarItems>
        <SidebarItemGroup>
          <SidebarItem href="#" icon={() => <IconLayoutDashboard size={20} />}>
            Dashboard
          </SidebarItem>
          <SidebarCollapse icon={() => <IconBrandShopee size={20} />} label="E-commerce">
            <SidebarItem href="#">Products</SidebarItem>
            <SidebarItem href="#">Sales</SidebarItem>
            <SidebarItem href="#">Refunds</SidebarItem>
            <SidebarItem href="#">Shipping</SidebarItem>
          </SidebarCollapse>
          <SidebarItem href="#" icon={() => <IconInbox size={20} />}>
            Inbox
          </SidebarItem>
          <SidebarItem href="#" icon={() => <IconUser size={20} />}>
            Users
          </SidebarItem>
          <SidebarItem href="#" icon={() => <IconShoppingBag size={20} />}>
            Products
          </SidebarItem>
          <SidebarItem href="#" icon={() => <IconLogin2 size={20} />}>
            Sign In
          </SidebarItem>
          <SidebarItem href="#" icon={() => <IconUserPlus size={20} />}>
            Sign Up
          </SidebarItem>
        </SidebarItemGroup>
      </SidebarItems>
    </Sidebar>  
              `}
          </CodeModal>
        </div>
        <Sidebar aria-label="Sidebar with multi-level dropdown example">
          <SidebarItems>
            <SidebarItemGroup>
              <SidebarItem
                href="#"
                icon={() => <IconLayoutDashboard size={20} />}
              >
                Dashboard
              </SidebarItem>
              <SidebarCollapse
                icon={() => <IconBrandShopee size={20} />}
                label="E-commerce"
              >
                <SidebarItem href="#">Products</SidebarItem>
                <SidebarItem href="#">Sales</SidebarItem>
                <SidebarItem href="#">Refunds</SidebarItem>
                <SidebarItem href="#">Shipping</SidebarItem>
              </SidebarCollapse>
              <SidebarItem href="#" icon={() => <IconInbox size={20} />}>
                Inbox
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconUser size={20} />}>
                Users
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconShoppingBag size={20} />}>
                Products
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconLogin2 size={20} />}>
                Sign In
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconUserPlus size={20} />}>
                Sign Up
              </SidebarItem>
            </SidebarItemGroup>
          </SidebarItems>
        </Sidebar>
      </CardBox>
    </div>
  );
};

export default MultilevelDropdown;
