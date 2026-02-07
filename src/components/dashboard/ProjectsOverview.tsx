"use client";
import React, { useState, useMemo } from "react";
import { Select } from "flowbite-react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import CardBox from "../shared/CardBox";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { ApexOptions } from "apexcharts";

interface CustomersData {
  series: { name: string; data: number[] }[];
  categories: string[];
  totalSales: string;
  subtitle: string;
}

const ProjectOverview = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("October 2025");

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(event.target.value);
  };

  const getCustomersData = useMemo<CustomersData>(() => {
    switch (selectedPeriod) {
      case "This Week":
        return {
          series: [
            {
              name: "Customers",
              data: [10, 15, 8, 5, 4, 12, 10],
            },
          ],
          categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          totalSales: "$36,358",
          subtitle: "Weekly Overview"
        };
      case "This Month":
        return {
          series: [
            {
              name: "Customers",
              data: [30, 23, 18, 25, 28, 30, 25],
            },
          ],
          categories: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          totalSales: "$136,034",
          subtitle: "Monthly Overview"
        };
      default:
        return {
          series: [
            {
              name: "Customers",
              data: [10, 15, 8, 5, 4, 12, 10],
            },
          ],
          categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          totalSales: "$36,358",
          subtitle: "Weekly Overview"
        };
    }
  }, [selectedPeriod]);
  const getProjectData = useMemo<CustomersData>(() => {
    switch (selectedPeriod) {
      case "This Week":
        return {
          series: [
            {
              name: "Project",
              data: [10, 15, 8, 5, 4, 12, 10],
            },
          ],
          categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          totalSales: "78,298",
          subtitle: "Weekly Overview"
        };
      case "This Month":
        return {
          series: [
            {
              name: "Project",
              data: [30, 23, 18, 25, 28, 30, 25],
            },
          ],
          categories: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          totalSales: "234,176",
          subtitle: "Monthly Overview"
        };
      default:
        return {
          series: [
            {
              name: "Project",
              data: [10, 15, 8, 5, 4, 12, 10],
            },
          ],
          categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          totalSales: "78,298",
          subtitle: "Weekly Overview"
        };
    }
  }, [selectedPeriod]);

  const CustomerChartData: ApexOptions = {
    series: getCustomersData.series,
    chart: {
      toolbar: { show: false },
      height: 50,
      type: "bar",
      fontFamily: "inherit",
      foreColor: "#ffffff",
      background: "transparent",
      sparkline: { enabled: true },
    },
    colors: ["var(--color-secondary)"],
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "30%",
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { show: false },
    xaxis: {
      categories: getCustomersData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#888888" } },
    },
    yaxis: { show: false },
    tooltip: { theme: "dark" },
  };

  const ProjectChartData: ApexOptions = {
    series: getProjectData.series,
    chart: {
      toolbar: { show: false },
      height: "50px",
      type: "bar",
      fontFamily: "inherit",
      foreColor: "#ffffff",
      background: "transparent",
      sparkline: { enabled: true },
    },
    colors: ["var(--color-primary)"],
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "30%",
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { show: false },
    xaxis: {
      categories: getProjectData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#888888" } },
    },
    yaxis: { show: false },
    tooltip: { theme: "dark" },
  };

  return (
    <CardBox>
      <div className="flex justify-between items-center">
        <div >
          <h5 className="text-lg font-medium dark:text-white">Projects overview</h5>
          <p className="text-sm text-darklink">{getCustomersData.subtitle}</p>
        </div>
        <Select
          id="periods"
          className="select-md dark:text-white bg-transparent border-0"
          value={selectedPeriod}
          onChange={handleSelectChange}
        >
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
        </Select>
      </div>
      {/* Customers Section */}
      <div className="p-5 border border-gray-950/10 dark:border-darkborder rounded-md flex justify-between sm:items-center items-start sm:flex-row flex-col 2xl:gap-9 sm:gap-0 gap-5 my-4">
        <div>
          <div className="flex items-center">
            <p className="dark:text-white text-xl font-medium">
              {getCustomersData.totalSales}
            </p>
            <p className="text-error flex text-xs ml-2">
              +9%
              <Icon icon="solar:arrow-left-down-line-duotone" height={16} />
            </p>
          </div>
          <p className="text-xs dark:text-darklink">Customers</p>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <Chart
            options={CustomerChartData}
            series={CustomerChartData.series}
            type="bar"
            height={75}
          />
        </div>
      </div>
      {/* Projects Section */}
      <div className="p-5 border border-gray-950/10 dark:border-darkborder rounded-md flex justify-between sm:items-center items-start sm:flex-row flex-col 2xl:gap-9 sm:gap-0 gap-5">
        <div>
          <div className="flex items-center">
            <p className="dark:text-white text-xl font-medium">
              {getProjectData.totalSales}
            </p>
            <p className="text-success flex text-xs ml-2">
              +9%
              <Icon icon="solar:arrow-right-up-line-duotone" height={16} />
            </p>
          </div>
          <p className="text-xs dark:text-darklink">Projects</p>
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <Chart
            options={ProjectChartData}
            series={ProjectChartData.series}
            type="bar"
            height={75}
          />
        </div>
      </div>

    </CardBox>
  );
};

export default ProjectOverview;
