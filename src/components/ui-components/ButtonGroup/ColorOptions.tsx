import { Button, ButtonGroup } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const ColorOptions = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Color Options</h4>
          <CodeModal>
            {`
    import { Button, ButtonGroup } from "flowbite-react";

    <ButtonGroup>
      <Button color="primary">Profile</Button>
      <Button color="primary">Settings</Button>
      <Button color="primary">Messages</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button color="info">Profile</Button>
      <Button color="info">Settings</Button>
      <Button color="info">Messages</Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button color="success">Profile</Button>
      <Button color="success">Settings</Button>
      <Button color="success">Messages</Button>
    </ButtonGroup>
            `}
          </CodeModal>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonGroup>
            <Button color="primary">Profile</Button>
            <Button color="primary">Settings</Button>
            <Button color="primary">Messages</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="info">Profile</Button>
            <Button color="info">Settings</Button>
            <Button color="info">Messages</Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="success">Profile</Button>
            <Button color="success">Settings</Button>
            <Button color="success">Messages</Button>
          </ButtonGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default ColorOptions;
