import { Avatar, AvatarGroup } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import StackLayoutCode from "./Code/StackLayoutCode";

const StackAvatar = () => {
  return (
    <CardBox>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-semibold">Stacked layout</h4>
        <StackLayoutCode />
      </div>
      <div className="flex flex-col flex-wrap gap-5">
        <AvatarGroup>
          <Avatar img="/images/profile/user-2.jpg" rounded stacked />
          <Avatar img="/images/profile/user-3.jpg" rounded stacked />
          <Avatar img="/images/profile/user-4.jpg" rounded stacked />
          <Avatar img="/images/profile/user-5.jpg" rounded stacked />
          <Avatar img="/images/profile/user-6.jpg" rounded stacked />
        </AvatarGroup>
        <AvatarGroup>
          <Avatar img="/images/profile/user-2.jpg" rounded stacked />
          <Avatar img="/images/profile/user-3.jpg" rounded stacked />
          <Avatar img="/images/profile/user-4.jpg" rounded stacked />
          <Avatar img="/images/profile/user-5.jpg" rounded stacked />
        </AvatarGroup>
      </div>

    </CardBox>
  );
};

export default StackAvatar;
