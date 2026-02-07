
import CodeModal from "../../CodeModal";

const DropdownSizesCode = () => {
  return (
    <div>
      <CodeModal>
        {`
import { Dropdown, DropdownItem } from "flowbite-react";
    
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
                `}
      </CodeModal>
    </div>
  );
};

export default DropdownSizesCode;
