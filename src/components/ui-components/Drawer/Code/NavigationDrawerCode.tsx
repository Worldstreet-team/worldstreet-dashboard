
import CodeModal from "../../CodeModal";

const NavigationDrawerCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    
    import { Button, Drawer, DrawerHeader, DrawerItems, Sidebar, SidebarItem, SidebarItemGroup, SidebarItems, TextInput } from "flowbite-react";
    import { useState } from "react";
    
    const [isNavigation, setIsNavigation] = useState(false);
    const navigationClose = () => setIsNavigation(false);
     <Drawer open={isNavigation} onClose={navigationClose} className="p-4">
            <DrawerHeader title="MENU" titleIcon={() => <></>} />
            <DrawerItems>
              <Sidebar
                aria-label="Sidebar with multi-level dropdown example"
                className="[&>div]:bg-transparent [&>div]:p-0"
              >
                <div className="flex h-full flex-col justify-between py-2">
                  <div>
                    <form className="pb-3 md:hidden">
                      <TextInput
                        icon={HiSearch}
                        type="search"
                        placeholder="Search"
                        required
                        size={32}
                      />
                    </form>
                    <SidebarItems>
                      <SidebarItemGroup>
                        <SidebarItem
                          href="/"
                          icon={() => <IconLayoutDashboard size={20} />}
                        >
                          Dashboard
                        </SidebarItem>
                        <SidebarItem
                          href="/e-commerce/products"
                          icon={() => <IconShoppingBag size={20} />}
                        >
                          Products
                        </SidebarItem>
                        <SidebarItem
                          href="/users/list"
                          icon={() => <IconListDetails size={20} />}
                        >
                          Users list
                        </SidebarItem>
                        <SidebarItem
                          href="/authentication/sign-in"
                          icon={() => <IconLogin2 size={20} />}
                        >
                          Sign in
                        </SidebarItem>
                        <SidebarItem
                          href="/authentication/sign-up"
                          icon={() => <IconUserPlus size={20} />}
                        >
                          Sign up
                        </SidebarItem>
                      </SidebarItemGroup>
                      <SidebarItemGroup>
                        <SidebarItem
                          href="https://github.com/themesberg/flowbite-react/"
                          icon={() => <IconFiles size={20} />}
                        >
                          Docs
                        </SidebarItem>
                        <SidebarItem
                          href="https://flowbite-react.com/"
                          icon={() => <IconComponents size={20} />}
                        >
                          Components
                        </SidebarItem>
                        <SidebarItem
                          href="https://github.com/themesberg/flowbite-react/issues"
                          icon={() => <IconInfoSquareRounded size={20} />}
                        >
                          Help
                        </SidebarItem>
                      </SidebarItemGroup>
                    </SidebarItems>
                  </div>
                </div>
              </Sidebar>
            </DrawerItems>
          </Drawer>
    `}
      </CodeModal>
    </div>
  );
};

export default NavigationDrawerCode;
