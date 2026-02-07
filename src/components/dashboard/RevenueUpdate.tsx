"use client";
import React, { useContext, useState } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";
import { Select } from "flowbite-react";
import { ApexOptions } from "apexcharts";
import CardBox from "../shared/CardBox";
import { CustomizerContext } from "@/app/context/customizerContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const RevenueUpdate = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("This Week");
  const { activeMode } = useContext(CustomizerContext);

  const getChartData = (period: string) => {
    switch (period) {
      case "December 2025":
        return {
          series: [
            {
              name: "2025",
              data: [
                2200, 2700, 1800, 1600, 2100, 1900, 2300, 2600, 2200, 2000,
              ],
            },
            {
              name: "2024",
              data: [
                -2000, -2500, -1800, -2100, -1900, -2300, -1700, -2200, -2400,
                -2100,
              ],
            },
          ],
          categories: [
            "1 Dec",
            "2 Dec",
            "3 Dec",
            "4 Dec",
            "5 Dec",
            "6 Dec",
            "7 Dec",
            "8 Dec",
            "9 Dec",
            "10 Dec",
          ],
        };
      case "November 2025":
        return {
          series: [
            {
              name: "2025",
              data: [
                2100, 2600, 1700, 1500, 2000, 1800, 2200, 2500, 2100, 1900,
              ],
            },
            {
              name: "2024",
              data: [
                -1900, -2400, -1700, -2000, -1800, -2200, -1600, -2100, -2300,
                -2000,
              ],
            },
          ],
          categories: [
            "1 Nov",
            "2 Nov",
            "3 Nov",
            "4 Nov",
            "5 Nov",
            "6 Nov",
            "7 Nov",
            "8 Nov",
            "9 Nov",
            "10 Nov",
          ],
        };
      case "September 2025":
        return {
          series: [
            {
              name: "2025",
              data: [
                2000, 2500, 1600, 1400, 1900, 1700, 2100, 2400, 2000, 1800,
              ],
            },
            {
              name: "2024",
              data: [
                -1800, -2300, -1600, -1900, -1700, -2100, -1500, -2000, -2200,
                -1900,
              ],
            },
          ],
          categories: [
            "1 Sep",
            "2 Sep",
            "3 Sep",
            "4 Sep",
            "5 Sep",
            "6 Sep",
            "7 Sep",
            "8 Sep",
            "9 Sep",
            "10 Sep",
          ],
        };
      case "October 2025":
        return {
          series: [
            {
              name: "2025",
              data: [
                2200, 2800, 1900, 1600, 2000, 1800, 2300, 2700, 2200, 2000,
              ],
            },
            {
              name: "2024",
              data: [
                -2100, -2600, -1900, -2200, -2000, -2400, -1800, -2300, -2500,
                -2200,
              ],
            },
          ],
          categories: [
            "1 Oct",
            "2 Oct",
            "3 Oct",
            "4 Oct",
            "5 Oct",
            "6 Oct",
            "7 Oct",
            "8 Oct",
            "9 Oct",
            "10 Oct",
          ],
        };
      default:
        return {
          series: [
            {
              name: "2025",
              data: [
                2200, 2800, 1900, 1600, 2000, 1800, 2300, 2700, 2200, 2000,
              ],
            },
            {
              name: "2024",
              data: [
                -2100, -2600, -1900, -2200, -2000, -2400, -1800, -2300, -2500,
                -2200,
              ],
            },
          ],
          categories: [
            "1 Oct",
            "2 Oct",
            "3 Oct",
            "4 Oct",
            "5 Oct",
            "6 Oct",
            "7 Oct",
            "8 Oct",
            "9 Oct",
            "10 Oct",
          ],
        };
    }
  };

  const optionsBarChart: ApexOptions = {
    chart: {
      offsetX: 0,
      offsetY: 10,
      stacked: true,
      animations: {
        speed: 500,
      },
      toolbar: {
        show: false,
      },
    },
    colors: ["var(--color-secondary)", "var(--color-lightsecondary)"],
    dataLabels: {
      enabled: false,
    },
    grid: {
      show: true,
      borderColor: `${activeMode === "light"
        ? "#0e10251a"
        : "#ffffff1a"
        }`,
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
    stroke: {
      curve: "smooth",
      width: 2,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        barHeight: "60%",
        columnWidth: "30%",
        borderRadius: 5,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "all",
      },
    },
    xaxis: {
      categories: getChartData(selectedPeriod).categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: `${activeMode === "light"
            ? "#0e102566"
            : "#ffffff66"
            }`,
        },
      },
    },
    yaxis: {
      min: -3000,
      max: 3000,
      tickAmount: 4,
      labels: {
        formatter: function (value: number) {
          if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
          }
          return String(value);
        },
        style: {
          colors: `${activeMode === "light" ? "#0e102566" : "#ffffff66"}`,
        },
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: "dark",
    },
  };

  const barChartData = getChartData(selectedPeriod);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(event.target.value);
  };

  return (
    <CardBox>
      <div className="flex justify-between sm:flex-row flex-col sm:items-center items-start gap-4">
        <div>
          <h5 className="text-lg font-medium dark:text-white">
            Revenue updates
          </h5>
          <p className="text-sm text-darklink">Up-to-Date Sales</p>
        </div>
        <Select
          id="periods"
          value={selectedPeriod}
          onChange={handleSelectChange}
          required
        >
          <option value="October 2025">October 2025</option>
          <option value="September 2025">September 2025</option>
          <option value="November 2025">November 2025</option>
          <option value="December 2025">December 2025</option>
        </Select>
      </div>
      <div className="grid grid-cols-12 sm:gap-9">
        <div className="mt-2 xl:col-span-8 col-span-12">
          <div className="">
            <Chart
              options={optionsBarChart}
              series={barChartData.series}
              type="bar"
              height="355px"
              width="100%"
            />
          </div>
        </div>
        <div className="xl:col-span-4 col-span-12">
          <div className="flex xl:flex-col sm:flex-row flex-col gap-4 w-full h-full justify-center items-start">
            <div className="flex w-full items-start gap-3 xl:pb-8 xl:mb-8 xl:border-b border-gray-950/10 dark:border-darkborder ">
              <div className="bg-secondary text-white rounded-md p-2">
                <Icon icon="solar:arrow-left-down-line-duotone" height={16} />
              </div>
              <div className="">
                <p className="text-xs dark:text-darklink">Earning this month</p>
                <div className="flex justify-between gap-6 items-end">
                  <h5 className="text-xl dark:text-white">$48,820</h5>
                  <p className="text-xs text-success flex">
                    45.5%
                    <Icon
                      icon="solar:arrow-right-up-line-duotone"
                      height={16}
                    />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-start w-full gap-3">
              <div className="bg-lightprimary text-dark rounded-md p-2">
                <Icon icon="solar:arrow-right-up-line-duotone" height={16} />
              </div>
              <div className="">
                <p className="text-xs dark:text-darklink">Expense this month</p>
                <div className="flex justify-between gap-6 items-end">
                  <h5 className="text-xl dark:text-white">$26,498</h5>
                  <p className="text-xs text-error flex">
                    45.5%
                    <Icon
                      icon="solar:arrow-left-down-line-duotone"
                      height={16}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CardBox>
  );
};

export default RevenueUpdate;
