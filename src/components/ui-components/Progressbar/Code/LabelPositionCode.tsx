
import CodeModal from "../../CodeModal";

const LabelPositionCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { Progress } from "flowbite-react";
    
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
            `}
      </CodeModal>
    </div>
  );
};

export default LabelPositionCode;
