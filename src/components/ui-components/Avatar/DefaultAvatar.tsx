import { Avatar } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";


const DefaultAvatar = () => {
  return (
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default Avatar</h4>
          <CodeModal>
            {`
    import { Avatar } from "flowbite-react";
    
    <div className="flex flex-wrap gap-2">
      <Avatar img={user2} rounded />
      <Avatar img={user3} />
    </div>
              `}
          </CodeModal>
        </div>
        <div className="flex flex-wrap gap-2">
          <Avatar img="/images/profile/user-2.jpg" rounded />
          <Avatar img="/images/profile/user-3.jpg" />
        </div>
      </CardBox>
  );
};

export default DefaultAvatar;
