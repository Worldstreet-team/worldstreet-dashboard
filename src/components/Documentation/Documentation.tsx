import { Configuration } from "./Configuration";
import { Introduction } from "./Introduction";
import { PackageStructure } from "./PackageStructure";
import { QuickStart } from "./QuickStart";
import CardBox from "../shared/CardBox";

export const Documentation = () => {
  return (
    <CardBox className="">
      <div className="container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) p-6">
        <div className="">
          <Introduction />
          <PackageStructure />
          <QuickStart />
          <Configuration />
        </div>
      </div>
    </CardBox>
  );
};
