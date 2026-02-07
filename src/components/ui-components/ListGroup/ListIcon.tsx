"use client";
import ListIconCode from "./Code/ListIconCode";
import { ListGroup, ListGroupItem } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import {
  HiCloudDownload,
  HiInbox,
  HiOutlineAdjustments,
  HiUserCircle,
} from "react-icons/hi";
const ListIcon = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">List group with icons</h4>
          <ListIconCode />
        </div>
        <div>
          <ListGroup>
            <ListGroupItem icon={HiUserCircle} active>
              Profile
            </ListGroupItem>
            <ListGroupItem icon={HiOutlineAdjustments}>
              Settings
            </ListGroupItem>
            <ListGroupItem icon={HiInbox}>Messages</ListGroupItem>
            <ListGroupItem icon={HiCloudDownload}>Download</ListGroupItem>
          </ListGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default ListIcon;
