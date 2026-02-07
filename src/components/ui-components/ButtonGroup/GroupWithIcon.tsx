import { Button, ButtonGroup } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import { HiAdjustments, HiCloudDownload, HiUserCircle } from "react-icons/hi";
const GroupWithIcon = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">
           Group With Icons
          </h4>
          <CodeModal>
            {`
    import { Button , ButtonGroup} from "flowbite-react";
    import { HiAdjustments, HiCloudDownload, HiUserCircle } from "react-icons/hi";
    
    <div className="flex flex-wrap gap-2">
    <ButtonGroup outline>
      <Button color="info" className="hover:bg-info hover:text-white" >
        <HiUserCircle className="mr-3 h-4 w-4" />
        Profile
      </Button>
      <Button color="info" className="hover:bg-info hover:text-white" >
        <HiAdjustments className="mr-3 h-4 w-4" />
        Settings
      </Button>
      <Button color="info" className="hover:bg-info hover:text-white" >
        <HiCloudDownload className="mr-3 h-4 w-4" />
        Messages
      </Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button color="primary">
        <HiUserCircle className="mr-3 h-4 w-4" />
        Profile
      </Button>
      <Button color="primary">
        <HiAdjustments className="mr-3 h-4 w-4" />
        Settings
      </Button>
      <Button color="primary">
        <HiCloudDownload className="mr-3 h-4 w-4" />
        Messages
      </Button>
    </ButtonGroup>
    <ButtonGroup>
      <Button color="secondary">
        <HiUserCircle className="mr-3 h-4 w-4" />
        Profile
      </Button>
      <Button color="secondary">
        <HiAdjustments className="mr-3 h-4 w-4" />
        Settings
      </Button>
      <Button color="secondary">
        <HiCloudDownload className="mr-3 h-4 w-4" />
        Messages
      </Button>
    </ButtonGroup>
    </div>
                `}
          </CodeModal>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <ButtonGroup outline>
            <Button color="info" className="hover:bg-info hover:text-white" >
              <HiUserCircle className="mr-3 h-4 w-4" />
              Profile
            </Button>
            <Button color="info" className="hover:bg-info hover:text-white" >
              <HiAdjustments className="mr-3 h-4 w-4" />
              Settings
            </Button>
            <Button color="info" className="hover:bg-info hover:text-white" >
              <HiCloudDownload className="mr-3 h-4 w-4" />
              Messages
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="primary">
              <HiUserCircle className="mr-3 h-4 w-4" />
              Profile
            </Button>
            <Button color="primary">
              <HiAdjustments className="mr-3 h-4 w-4" />
              Settings
            </Button>
            <Button color="primary">
              <HiCloudDownload className="mr-3 h-4 w-4" />
              Messages
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button color="secondary">
              <HiUserCircle className="mr-3 h-4 w-4" />
              Profile
            </Button>
            <Button color="secondary">
              <HiAdjustments className="mr-3 h-4 w-4" />
              Settings
            </Button>
            <Button color="secondary">
              <HiCloudDownload className="mr-3 h-4 w-4" />
              Messages
            </Button>
          </ButtonGroup>
        </div>
      </CardBox>
    </div>
  );
};

export default GroupWithIcon;
