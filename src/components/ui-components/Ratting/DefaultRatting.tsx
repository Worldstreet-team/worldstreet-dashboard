
import { Rating, RatingStar } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const DefaultRatting = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default rating</h4>
          <CodeModal>
            {`
    import { Rating, RatingStar } from "flowbite-react";

    <Rating>
      <RatingStar />
      <RatingStar />
      <RatingStar />
      <RatingStar />
      <RatingStar filled={false} />
    </Rating>  
                `}
          </CodeModal>
        </div>
        <Rating>
          <RatingStar />
          <RatingStar />
          <RatingStar />
          <RatingStar />
          <RatingStar filled={false} />
        </Rating>
      </CardBox>
    </div>
  );
};

export default DefaultRatting;
