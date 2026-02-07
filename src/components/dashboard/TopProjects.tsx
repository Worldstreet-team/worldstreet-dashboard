"use client";
import { useState } from "react";
import {
  Select,
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
} from "flowbite-react";
import { Icon } from "@iconify/react";
import Image from "next/image";
import CardBox from "../shared/CardBox";

type Priority = "Low" | "Medium" | "High";

const initialData = [
  {
    image: "/images/profile/user-1.png",
    employee: "John Doe",
    post: "Web Designer",
    projects: "Website redesign",
    priority: "Low" as Priority,
    color: "text-lightsuccess",
    background: "bg-successemphasis",
    amount: "$12,000",
  },
  {
    image: "/images/profile/user-2.png",
    employee: "Jane Smith",
    post: "Web Designer",
    projects: "Mobile app ui",
    priority: "Medium" as Priority,
    color: "text-lightwarning",
    background: "bg-warningemphasis",
    amount: "$8,500",
  },
  {
    image: "/images/profile/user-3.png",
    employee: "Michael Brown",
    post: "Web Designer",
    projects: "Database setup",
    priority: "High" as Priority,
    color: "text-lighterror",
    background: "bg-erroremphasis",
    amount: "$15,000",
  },
  {
    image: "/images/profile/user-4.png",
    employee: "Sarah Connor",
    post: "Web Designer",
    projects: "Content strategy",
    priority: "Low" as Priority,
    color: "text-lightsuccess",
    background: "bg-successemphasis",
    amount: "$3,000",
  },
];

const TopProjects = () => {
  const [sortOption, setSortOption] = useState("Price High");

  const priorityLevels: Record<Priority, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value);
  };

  const sortedData = [...initialData].sort((a, b) => {
    if (sortOption === "Price High") {
      return (
        parseFloat(b.amount.slice(1).replace(",", "")) -
        parseFloat(a.amount.slice(1).replace(",", ""))
      );
    } else if (sortOption === "Price Low") {
      return (
        parseFloat(a.amount.slice(1).replace(",", "")) -
        parseFloat(b.amount.slice(1).replace(",", ""))
      );
    } else if (sortOption === "Priority High") {
      return priorityLevels[b.priority] - priorityLevels[a.priority];
    } else if (sortOption === "Priority Low") {
      return priorityLevels[a.priority] - priorityLevels[b.priority];
    }
    return 0;
  });

  return (
    <CardBox>
      <div className="flex justify-between sm:items-center items-start sm:flex-row flex-col gap-4 mb-6">
        <div>
          <h5 className="text-lg font-medium">Employee Task Overview</h5>
          <p className="text-sm text-darklink">Task Distribution</p>
        </div>
        <Select
          id="periods"
          className="select-md dark:text-white bg-transparent border-0"
          value={sortOption}
          onChange={handleSortChange}
        >
          <option value="Price High">Price High To Low</option>
          <option value="Price Low">Price Low To High</option>
          <option value="Priority High">Priority High To Low</option>
          <option value="Priority Low">Priority Low To High</option>
        </Select>
      </div>

      <div className="border border-gray-950/10 dark:border-darkborder rounded-lg overflow-auto">
        <Table className="">
          <TableHead className="border-b border-gray-950/10 dark:border-darkborder capitalize">
            <TableRow>
              <TableHeadCell className="py-2 px-3 text-ld font-normal">
                <div className="flex gap-2 items-center dark:text-darklink dark:opacity-100 text-black opacity-60">
                  <Icon icon="ph:text-a-underline-duotone" height={20} />
                  Employee
                </div>
              </TableHeadCell>
              <TableHeadCell className="text-ld font-normal">
                <div className="flex gap-2 items-center dark:text-darklink dark:opacity-100 text-black opacity-60">
                  <Icon icon="ph:circles-four-duotone" height={20} />
                  Projects
                </div>
              </TableHeadCell>
              <TableHeadCell className="text-ld font-normal">
                <div className="flex gap-2 items-center dark:text-darklink dark:opacity-100 text-black opacity-60">
                  <Icon icon="ph:arrow-circle-down-duotone" height={20} />
                  Priority
                </div>
              </TableHeadCell>
              <TableHeadCell className="text-ld font-normal">
                <div className="flex gap-2 items-center dark:text-darklink dark:opacity-100 text-black opacity-60">
                  <Icon icon="ph:currency-circle-dollar-duotone" height={20} />
                  Amount
                </div>
              </TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow
                key={index}
                className="border-b border-gray-950/10 dark:border-darkborder py-4"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Image
                      src={row.image}
                      alt={row.employee}
                      width={32}
                      height={32}
                    />
                    <div className="">
                      <h5 className="dark:text-white text-black text-sm font-medium whitespace-nowrap">
                        {row.employee}
                      </h5>
                      <p className="dark:text-darklink dark:opacity-100 text-black whitespace-nowrap opacity-60 text-xs">
                        {row.post}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm  dark:opacity-100 dark:text-darklink text-black whitespace-nowrap opacity-80">
                    {row.projects}
                  </p>
                </TableCell>
                <TableCell>
                  <div
                    className={`${row.background} text-white w-fit py-1 px-2 rounded-sm text-xs font-medium`}
                  >
                    {row.priority}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="dark:text-white text-black text-sm">
                    {row.amount}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardBox>
  );
};

export default TopProjects;
