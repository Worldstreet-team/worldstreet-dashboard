"use client";
import React, { useContext } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import CardBox from "../shared/CardBox";
import { CustomizerContext } from "@/app/context/customizerContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MonthlyEarnings = () => {
  const { activeMode } = useContext(CustomizerContext);
  const ChartData: any = {
    series: [
      {
        name: "2022",
        data: [45, 30, 48, 30, 48, 30, 40],
      },
    ],
    chart: {
      toolbar: {
        show: false,
      },
      type: "area",
      height: 200,
      fontFamily: "inherit",
      foreColor: "#adb0bb",
      stacked: false,
    },
    colors: ["var(--color-success)"],

    plotOptions: {},
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    stroke: {
      width: 2,
      curve: "monotoneCubic",
    },
    grid: {
      show: true,
      padding: {
        top: 0,
        bottom: 0,
      },
      borderColor: `${activeMode === "light" ? "#0e10250d" : "#ffffff0d"}`,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0,
        inverseColors: false,
        opacityFrom: 0.05,
        opacityTo: 0.01,
        stops: [100],
      },
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      categories: ["Mon", "Tue", "Wed", "The", "Fri", "Sat", "Sun"],
    },
    yaxis: {
      show: false,
      min: 0,
      max: 70,
    },
    markers: {
      size: 4,
      strokeColor: ["var(--color-success)"],
      strokeWidth: 2,
    },
    tooltip: {
      theme: "dark",
    },
  };
  return (
    <CardBox className="h-full">
      <div className="h-full flex justify-between flex-col">
        <div className="flex justify-between items-center">
          <div className="">
            <h3 className="text-lg font-medium dark:text-white">Weekly earning</h3>
            <p className="text-sm text-darklink">Every week</p>
          </div>
          <div className="p-2 bg-primary rounded-md text-white">
            <Icon icon="ph:currency-circle-dollar-duotone" height={30} />
          </div>
        </div>
        <div className="flex items-end gap-1">
          <p className="dark:text-white text-xl font-medium">$6,820</p>
          <p className="text-error flex text-xs">
            +9% from last year
            <Icon icon="solar:arrow-left-down-line-duotone" height={16} />
          </p>
        </div>
        <div>
          <Chart
            options={ChartData}
            series={ChartData.series}
            type="area"
            height="200px"
          />
        </div>
      </div>
    </CardBox>
  );
};

export default MonthlyEarnings;
