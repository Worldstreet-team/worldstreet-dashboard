"use client"
import CardBox from "@/components/shared/CardBox";
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from 'flowbite-react'
import DropDownIconCode from './Code/DropDownIconCode'
import { HiCog, HiCurrencyDollar, HiLogout, HiViewGrid } from "react-icons/hi";
const DropdownWithIcon = () => {
  return (
    <>
        <CardBox>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Dropdown items with icon</h4>
              <DropDownIconCode/> 
            </div>
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
          </CardBox>
    </>
  )
}

export default DropdownWithIcon
