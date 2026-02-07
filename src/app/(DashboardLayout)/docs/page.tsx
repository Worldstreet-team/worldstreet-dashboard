import React from "react";
import type { Metadata } from "next";
import BreadcrumbComp from "../layout//shared/breadcrumb/BreadcrumbComp";
import { Documentation } from "@/components/Documentation/Documentation";

export const metadata: Metadata = {
  title: "Documentation",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Documentation",
  },
];

const Page = () => {
  return (
    <div>
      <BreadcrumbComp title="Documentation" items={BCrumb} />
      <Documentation />
    </div>
  );
};

export default Page;
