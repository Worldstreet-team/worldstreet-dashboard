
import { ListGroup, ListGroupItem } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import LinkListCode from "./Code/LinkListCode";

const LinkList = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">List items as links</h4>
          <LinkListCode />
        </div>
        <div>
          <ListGroup>
            <ListGroupItem href="#" active>
              Profile
            </ListGroupItem>
            <ListGroupItem href="#">Settings</ListGroupItem>
            <ListGroupItem href="#">Messages</ListGroupItem>
            <ListGroupItem href="#">Download</ListGroupItem>
          </ListGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default LinkList;
