import { Spinner } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const DefaultSpinner = () => {
  return (
    <CardBox>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-semibold">Default Spinner</h4>
        <CodeModal>
          {`
    import { Spinner } from "flowbite-react";
    <Spinner aria-label="Default status example" />
        `}
        </CodeModal>
      </div>

      <div>
        <Spinner aria-label="Default status example" />
      </div>
    </CardBox>
  );
};

export default DefaultSpinner;
