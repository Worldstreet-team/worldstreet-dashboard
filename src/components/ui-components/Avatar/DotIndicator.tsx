import { Avatar } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const DotIndicator = () => {
  return (
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-lg font-semibold">Dot indicator</h4>
          </div>
          <CodeModal>
            {`
      import { Avatar } from "flowbite-react";
      
      <div className="flex flex-wrap gap-2">
        <Avatar img="/src/assets/images/profile/user-2.jpg" status="online" />
        <Avatar
          img={user3}
          rounded
          status="busy"
          statusPosition="top-right"
        />
        <Avatar
          img={user4}
          status="offline"
          statusPosition="bottom-left"
        />
        <Avatar
          img={user5}
          rounded
          status="away"
          statusPosition="bottom-right"
        />
      </div>  
                `}
          </CodeModal>
        </div>
        <div className="flex flex-wrap gap-2">
          <Avatar img="/images/profile/user-2.jpg" status="online" />
          <Avatar
            img="/images/profile/user-3.jpg"
            rounded
            status="busy"
            statusPosition="top-right"
          />
          <Avatar
            img="/images/profile/user-4.jpg"
            status="offline"
            statusPosition="bottom-left"
          />
          <Avatar
            img="/images/profile/user-5.jpg"
            rounded
            status="away"
            statusPosition="bottom-right"
          />
        </div>
      </CardBox>
  );
};

export default DotIndicator;
