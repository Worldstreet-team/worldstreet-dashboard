
import CardBox from "@/components/shared/CardBox";
import { Dropdown, DropdownItem } from "flowbite-react";
import DropdownSizesCode from "./Code/DropdownSizesCode";

const DropDownSize = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Dropdown sizes</h4>
          <DropdownSizesCode />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Dropdown label="Small dropdown" size="sm" color="success">
            <DropdownItem>Dashboard</DropdownItem>
            <DropdownItem>Settings</DropdownItem>
            <DropdownItem>Earnings</DropdownItem>
            <DropdownItem>Sign out</DropdownItem>
          </Dropdown>
          <Dropdown label="Large dropdown" size="lg" color="error">
            <DropdownItem>Dashboard</DropdownItem>
            <DropdownItem>Settings</DropdownItem>
            <DropdownItem>Earnings</DropdownItem>
            <DropdownItem>Sign out</DropdownItem>
          </Dropdown>
        </div>
      </CardBox>
    </div>
  );
};

export default DropDownSize;
