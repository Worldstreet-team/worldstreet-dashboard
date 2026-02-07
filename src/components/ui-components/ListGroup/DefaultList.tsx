
import { ListGroup, ListGroupItem } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import DefaultListcode from "./Code/DefaultListCode";

const DefaultList = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default list group</h4>
          <DefaultListcode />
        </div>
        <div>
          <ListGroup>
            <ListGroupItem>Profile</ListGroupItem>
            <ListGroupItem>Settings</ListGroupItem>
            <ListGroupItem>Messages</ListGroupItem>
            <ListGroupItem disabled>Download</ListGroupItem>
          </ListGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default DefaultList;
