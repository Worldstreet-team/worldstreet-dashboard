"use client";
import React, { useContext, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import CardBox from "../shared/CardBox";
import { CustomizerContext } from "@/app/context/customizerContext";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const YearlyBreakup = () => {
  const { activeMode } = useContext(CustomizerContext);
  const ChartData: any = {
    series: [46, 52],
    labels: ["10%", "36%"],
    chart: {
      type: "radialBar",
      height: 230,
      fontFamily: "inherit",
      foreColor: "#ffffff0d",
    },
    plotOptions: {
      radialBar: {
        inverseOrder: false,
        startAngle: 0,
        endAngle: 360,
        hollow: {
          margin: 1,
          size: "70%",
        },
        dataLabels: {
          show: false,
        },
        track: {
          show: true,
          background: `${activeMode === "light" ? "#0e10250d" : "#ffffff0d"
            }`,
        },
      },
    },
    legend: {
      show: false,
    },
    stroke: { width: 1, lineCap: "round" },
    tooltip: {
      enabled: false,
      fillSeriesColor: false,
    },
    colors: ["var(--color-secondary)", "var(--color-primary)"],
  };

  return (
    <CardBox>
      <div>
        <h5 className="text-lg text-black dark:text-white font-medium">
          Yearly backup
        </h5>
        <p className="text-sm text-darklink">Spending Breakdown</p>
      </div>
      <div className="relative">
        <Chart
          options={ChartData}
          series={ChartData.series}
          type="radialBar"
          height="330px"
          width="100%"
        />
        <div className="absolute top-40% left-1/3 sm:left-40% md:left-1/3 text-center">
          <h4 className="text-xl font-medium text-black dark:text-white ">
            $36,358
          </h4>
          <p className="text-success flex text-xs">
            +9% from last year
            <Icon icon="solar:arrow-right-up-line-duotone" height={16} />
          </p>
        </div>
      </div>
      <div>
        <div className="flex gap-5 items-center justify-center md:mt-0 mt-4">
          <div>
            <div className="flex gap-2 text-sm items-center">
              <span className="bg-primary rounded-full h-2 w-2"></span>
              <span className="text-ld opacity-80 dark:opacity-100 dark:text-darklink">
                Previous year
              </span>
            </div>
            <h4 className="text-black dark:text-white text-base font-medium mt-1 ms-4">
              2024
            </h4>
          </div>
          <div>
            <div className="flex gap-2 text-sm text-ld items-center">
              <span className="bg-secondary rounded-full h-2 w-2"></span>
              <span className="text-ld opacity-80 dark:opacity-100 dark:text-darklink">
                Current year
              </span>
            </div>
            <h4 className="text-black dark:text-white text-base font-medium mt-1 ms-4">
              2025
            </h4>
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default YearlyBreakup;
