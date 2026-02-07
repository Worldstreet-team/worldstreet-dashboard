"use client";
import ListButtonCode from "./Code/ListButtonCode";
import { ListGroup, ListGroupItem } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";

const ListButton = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">List group with buttons</h4>
          <ListButtonCode />
        </div>
        <div>
          <ListGroup>
            <ListGroupItem onClick={() => alert("Profile clicked!")} active>
              Profile
            </ListGroupItem>
            <ListGroupItem>Settings</ListGroupItem>
            <ListGroupItem>Messages</ListGroupItem>
            <ListGroupItem>Download</ListGroupItem>
          </ListGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default ListButton;
