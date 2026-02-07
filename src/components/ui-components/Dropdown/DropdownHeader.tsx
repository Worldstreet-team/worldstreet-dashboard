
import CardBox from "@/components/shared/CardBox";
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from "flowbite-react";
import DropDownHeaderCode from "./Code/DropDownHeaderCode";

const DropDownHeader = () => {
  return (
    <>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Dropdown Header</h4>
          <DropDownHeaderCode />
        </div>
        <Dropdown
          label="Dropdown Button"
          dismissOnClick={false}
          className="flex-wrap"
          color="primary"
        >
          <DropdownItem>Dashboard</DropdownItem>
          <DropdownItem>Settings</DropdownItem>
          <DropdownItem>Earnings</DropdownItem>
          <DropdownItem>Sign out</DropdownItem>
        </Dropdown>

        <Dropdown label="Dropdown Button" color="secondary">
          <DropdownHeader>
            <span className="block text-sm">Bonnie Green</span>
            <span className="block truncate text-sm font-medium">
              bonnie@flowbite.com
            </span>
          </DropdownHeader>
          <DropdownItem>Dashboard</DropdownItem>
          <DropdownItem>Settings</DropdownItem>
          <DropdownItem>Earnings</DropdownItem>
          <DropdownDivider />
          <DropdownItem>Sign out</DropdownItem>
        </Dropdown>
      </CardBox>
    </>
  );
};

export default DropDownHeader;
