
import { Rating, RatingAdvanced, RatingStar } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const AdvanceRatting = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Advanced Rating</h4>
          <CodeModal>
            {`
      import { Rating, RatingAdvanced, RatingStar } from "flowbite-react";

      <Rating className="mb-2">
        <RatingStar />
        <RatingStar />
        <RatingStar />
        <RatingStar />
        <RatingStar filled={false} />
        <p className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
          4.95 out of 5
        </p>
      </Rating>
      <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        1,745 global ratings
      </p>
      <RatingAdvanced percentFilled={70} className="mb-2">
        5 star
      </RatingAdvanced>
      <RatingAdvanced percentFilled={17} className="mb-2">
        4 star
      </RatingAdvanced>
      <RatingAdvanced percentFilled={8} className="mb-2">
        3 star
      </RatingAdvanced>
      <RatingAdvanced percentFilled={4} className="mb-2">
        2 star
      </RatingAdvanced>
      <RatingAdvanced percentFilled={1}>1 star</RatingAdvanced>
                `}
          </CodeModal>
        </div>
        <Rating className="mb-2">
          <RatingStar />
          <RatingStar />
          <RatingStar />
          <RatingStar />
          <RatingStar filled={false} />
          <p className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            4.95 out of 5
          </p>
        </Rating>
        <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
          1,745 global ratings
        </p>
        <RatingAdvanced percentFilled={70} className="mb-2">
          5 star
        </RatingAdvanced>
        <RatingAdvanced percentFilled={17} className="mb-2">
          4 star
        </RatingAdvanced>
        <RatingAdvanced percentFilled={8} className="mb-2">
          3 star
        </RatingAdvanced>
        <RatingAdvanced percentFilled={4} className="mb-2">
          2 star
        </RatingAdvanced>
        <RatingAdvanced percentFilled={1}>1 star</RatingAdvanced>
      </CardBox>
    </div>
  );
};

export default AdvanceRatting;
