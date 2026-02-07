import { Progress } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import LabelPositionCode from "./Code/LabelPositionCode";

const LabelPostionProgress = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">
            Progress Bar Label Positioning
          </h4>
          <LabelPositionCode />
        </div>
        <Progress
          progress={20}
          progressLabelPosition="inside"
          textLabel="Bitcoin"
          textLabelPosition="outside"
          size="lg"
          labelProgress
          labelText
        />
        <Progress
          progress={40}
          progressLabelPosition="inside"
          textLabel="Ethereum"
          textLabelPosition="outside"
          size="lg"
          labelProgress
          labelText
        />
        <Progress
          progress={60}
          progressLabelPosition="inside"
          textLabel="Solana"
          textLabelPosition="outside"
          size="lg"
          labelProgress
          labelText
        />
        <Progress
          progress={80}
          progressLabelPosition="inside"
          textLabel="Cardano"
          textLabelPosition="outside"
          size="lg"
          labelProgress
          labelText
        />
        <Progress
          progress={100}
          progressLabelPosition="inside"
          textLabel="Polygon"
          textLabelPosition="outside"
          size="lg"
          labelProgress
          labelText
        />
      </CardBox>
    </div>
  );
};

export default LabelPostionProgress;
