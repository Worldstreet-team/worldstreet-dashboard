
import { Rating,RatingStar } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const WithTextRattings = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Rating With Text</h4>
          <CodeModal>
            {`
    import { Rating,RatingStar } from "flowbite-react";

    <Rating>
        <RatingStar />
        <RatingStar />
        <RatingStar />
        <RatingStar />
        <RatingStar filled={false} />
        <p className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
           4.95 out of 5
        </p>
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
          <p className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            4.95 out of 5
          </p>
        </Rating>
      </CardBox>
    </div>
  );
};

export default WithTextRattings;
