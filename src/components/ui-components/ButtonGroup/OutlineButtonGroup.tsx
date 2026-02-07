import { Button, ButtonGroup } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const OutlineButtonGroup = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Outline button group</h4>
          <CodeModal>
            {`
      import { Button, ButtonGroup } from "flowbite-react";
      
      <div className="flex flex-wrap gap-2">
        <ButtonGroup outline >
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
          <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
        </ButtonGroup>
          <ButtonGroup>
            <Button color="primary">Profile</Button>
            <Button color="primary">Settings</Button>
            <Button color="primary">Messages</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="primary">Profile</Button>
            <Button color="primary">Settings</Button>
            <Button color="primary">Messages</Button>
          </ButtonGroup>
      </div>
                `}
          </CodeModal>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonGroup outline >
            <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Profile</Button>
            <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Settings</Button>
            <Button className="border-border dark:border-darkborder hover:bg-primary hover:border-primary dark:text-gray-400 text-gray-900">Messages</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="primary">Profile</Button>
            <Button color="primary">Settings</Button>
            <Button color="primary">Messages</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="primary">Profile</Button>
            <Button color="primary">Settings</Button>
            <Button color="primary">Messages</Button>
          </ButtonGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default OutlineButtonGroup;
