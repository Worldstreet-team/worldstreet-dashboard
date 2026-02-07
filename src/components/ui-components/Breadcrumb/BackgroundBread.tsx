"use client"
import CardBox from "@/components/shared/CardBox";
import { Breadcrumb, BreadcrumbItem } from "flowbite-react";
import BbgColor from "./Code/BbgColor";
import { HiHome } from "react-icons/hi";
const BackgroundBread = () => {
  return (
    <div>
      <CardBox>
        <div className="flex  items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Background Color</h4>
          <BbgColor />
        </div>
        <Breadcrumb
          aria-label="Solid background breadcrumb example"
          className="bg-muted px-5 py-3 dark:bg-darkmuted rounded-md"
        >
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

export default BackgroundBread;
