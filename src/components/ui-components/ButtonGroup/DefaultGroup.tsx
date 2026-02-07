import { Button, ButtonGroup } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const DefaultGroup = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Default Button Group</h4>
          <CodeModal>
            {`
    import { Button, ButtonGroup } from "flowbite-react";

    <ButtonGroup outline >
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
    </ButtonGroup>
    <ButtonGroup outline >
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
    </ButtonGroup>
    <ButtonGroup outline >
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
      <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
    </ButtonGroup>
            `}
          </CodeModal>
        </div>

        <ButtonGroup outline >
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
        </ButtonGroup>
        <ButtonGroup outline >
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
        </ButtonGroup>
        <ButtonGroup outline >
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
        </ButtonGroup>
      </CardBox>
    </div>
  );
};

export default DefaultGroup;
