"use client"
import {
  IconLayoutDashboard,
  IconBrandTrello,
  IconInbox,
  IconUser,
  IconShoppingBag,
  IconLogin2,
  IconUserPlus,
} from "@tabler/icons-react";
import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";

const SidebarWithLogo = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold mb-2">Sidebar with logo</h4>
          <CodeModal>
            {`
            
    import { Sidebar, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
    import { IconBrandShopee, IconBrandTrello, IconFileText, IconInbox, IconInfoSquareRounded, IconLayoutDashboard, IconLogin2, IconShoppingBag, IconUser, IconUserPlus, IconWorldUpload } from "@tabler/icons-react";

    <Sidebar aria-label="Sidebar with logo branding example">
          <div className="pb-5">
            <FullLogo />
          </div>
          <SidebarItems>
            <SidebarItemGroup>
              <SidebarItem
                href="#"
                icon={() => <IconLayoutDashboard size={20} />}
              >
                Dashboard
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconBrandTrello size={20} />}>
                Kanban
              </SidebarItem>
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

        <Sidebar aria-label="Sidebar with logo branding example">
          <div className="pb-5">
            <FullLogo />
          </div>
          <SidebarItems>
            <SidebarItemGroup>
              <SidebarItem
                href="#"
                icon={() => <IconLayoutDashboard size={20} />}
              >
                Dashboard
              </SidebarItem>
              <SidebarItem href="#" icon={() => <IconBrandTrello size={20} />}>
                Kanban
              </SidebarItem>
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

export default SidebarWithLogo;
