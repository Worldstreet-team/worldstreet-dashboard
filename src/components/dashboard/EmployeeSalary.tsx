"use client";
import React, { useState, useMemo } from "react";
import { Select } from "flowbite-react";
import dynamic from "next/dynamic";
import CardBox from "../shared/CardBox";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const EmployeeSalary = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("October 2025");

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(event.target.value);
  };

  const getChartData = useMemo(() => {
    switch (selectedPeriod) {
      case "Year 2025":
        return {
          series: [
            {
              name: "Total sales",
              data: [20, 13, 17, 15, 18, 20, 19],
            },
            {
              name: "Expenses",
              data: [15, 18, 18, 16, 13, 18, 16],
            },
          ],
          categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
          totalSales: "$36,358",
          expenses: "$5,296",
        };
      case "Year 2024":
        return {
          series: [
            {
              name: "Total sales",
              data: [18, 12, 16, 14, 19, 21, 20],
            },
            {
              name: "Expenses",
              data: [16, 15, 19, 13, 14, 17, 18],
            },
          ],
          categories: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          totalSales: "$34,542",
          expenses: "$4,982",
        };
      default:
        return {
          series: [
            {
              name: "Total sales",
              data: [20, 14, 15, 18, 22, 17, 19],
            },
            {
              name: "Expenses",
              data: [17, 19, 14, 12, 20, 16, 18],
            },
          ],
          categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
          totalSales: "$32,914",
          expenses: "$5,178",
        };
    }
  }, [selectedPeriod]);

  const ChartData: any = {
    series: getChartData.series,
    chart: {
      toolbar: { show: false },
      type: "bar",
      fontFamily: "inherit",
      foreColor: "#ffffff",
      background: "transparent",
      sparkline: {
        enabled: true,
      },
    },
    colors: ["var(--color-secondary)", "var(--color-lightsecondary)"],
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: "50%",
        distributed: false,
        endingShape: "flat",
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      show: false,
    },
    xaxis: {
      categories: getChartData.categories,
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
        <div>
          <h5 className="text-lg font-medium dark:text-white">Financial Summary</h5>
          <p className="text-sm text-darklink">Every month</p>
        </div>
        <Select
          id="periods"
          className="select-md dark:text-white bg-transparent border-0"
          value={selectedPeriod}
          onChange={handleSelectChange}
        >
          <option value="Year 2025">Year 2025</option>
          <option value="Year 2024">Year 2024</option>
        </Select>
      </div>
      <div className="flex items-center gap-6 mt-4">
        <div className="flex gap-2 items-start">
          <div className="bg-secondary w-3 h-3 rounded-sm mt-1"></div>
          <div className="">
            <p className=" text-black dark:text-darklink text-opacity-60">
              Total sales
            </p>
            <p className="text-xl font-medium text-black dark:text-white">
              {getChartData.totalSales}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="flex gap-2 items-start">
            <div className="bg-lightprimary w-3 h-3 rounded-sm mt-1"></div>
            <div className="">
              <p className=" text-black dark:text-darklink text-opacity-60">
                Expenses
              </p>
              <p className="text-xl font-medium text-black dark:text-white">
                {getChartData.expenses}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <Chart
          options={ChartData}
          series={ChartData.series}
          type="bar"
        // height="130px"
        />
      </div>
    </CardBox>
  );
};

export default EmployeeSalary;
