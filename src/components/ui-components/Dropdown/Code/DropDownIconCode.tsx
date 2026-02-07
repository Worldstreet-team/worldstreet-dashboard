
import CodeModal from "../../CodeModal";

const DropDownIconCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { Dropdown } from "flowbite-react";
    import { HiCog, HiCurrencyDollar, HiLogout, HiViewGrid } from "react-icons/hi";

    <Dropdown label="Dropdown" color="info">
      <DropdownHeader>
        <span className="block text-sm">Bonnie Green</span>
        <span className="block truncate text-sm font-medium">
          bonnie@flowbite.com
        </span>
      </DropdownHeader>
      <DropdownItem icon={HiViewGrid}>Dashboard</DropdownItem>
      <DropdownItem icon={HiCog}>Settings</DropdownItem>
      <DropdownItem icon={HiCurrencyDollar}>Earnings</DropdownItem>
      <DropdownDivider />
      <DropdownItem icon={HiLogout}>Sign out</DropdownItem>
    </Dropdown>

    <h4 className="text-lg font-semibold">Inline dropdown</h4>
    <Dropdown label="Dropdown" inline>
      <DropdownItem>Dashboard</DropdownItem>
      <DropdownItem>Settings</DropdownItem>
      <DropdownItem>Earnings</DropdownItem>
      <DropdownItem>Sign out</DropdownItem>
    </Dropdown>  
                `}
      </CodeModal>
    </div>
  );
};

export default DropDownIconCode;
