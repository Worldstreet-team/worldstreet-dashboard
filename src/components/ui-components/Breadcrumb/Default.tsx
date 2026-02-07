"use client"
import CardBox from "@/components/shared/CardBox";
import { Breadcrumb, BreadcrumbItem } from "flowbite-react";
import BDefaultCode from "./Code/BDefaultCode";
import { HiHome } from "react-icons/hi";
const Default = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default Breadcrumb</h4>
          <BDefaultCode />
        </div>
        <Breadcrumb aria-label="Default breadcrumb example" className="justify-start! w-auto!">
          <BreadcrumbItem href="#" icon={HiHome}>
            Home
          </BreadcrumbItem>
          <BreadcrumbItem href="#">Projects</BreadcrumbItem>
          <BreadcrumbItem>matdash IM</BreadcrumbItem>
        </Breadcrumb>
      </CardBox>
    </div>
  );
};

export default Default;
