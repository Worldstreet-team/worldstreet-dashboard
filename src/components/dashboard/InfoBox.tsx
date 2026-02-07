"use client";
import React from "react";
import { Icon } from "@iconify/react";
import CardBox from "../shared/CardBox";

const InfoBox = () => {
  const InfoData = [
    {
      icon: "ph:user-rectangle-duotone",
      title: "Employees",
      count: "96",
      color: "bg-primary",
    },
    {
      icon: "ph:toolbox-duotone",
      title: "Clients",
      count: "3,650",
      color: "bg-success",
    },
    {
      icon: "ph:clipboard-text-duotone",
      title: "Projects",
      count: "356",
      color: "bg-warning",
    },
    {
      icon: "ph:calendar-dots-duotone",
      title: "Events",
      count: "696",
      color: "bg-secondary",
    },
    {
      icon: "ph:currency-circle-dollar-duotone",
      title: "Payroll",
      count: "$96k",
      color: "bg-error",
    },
  ];

  return (
    <div className="grid xl:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-6 gap-2">
      {InfoData.map((item, index) => (
        <div key={index}>
          <CardBox>
            <div className="flex items-center gap-4">
              <div className={`p-2 ${item.color} rounded-md`}>
                <span className="text-white">
                  <Icon icon={item.icon} height={30} />
                </span>
              </div>
              <div>
                <h4 className="text-lg font-medium dark:text-white mb-0">
                  {item.count}
                </h4>
                <p className="text-sm font-semibold text-darklink mb-0">
                  {item.title}
                </p>
              </div>
            </div>
          </CardBox>
        </div>
      ))}
    </div>
  );
};

export default InfoBox;
