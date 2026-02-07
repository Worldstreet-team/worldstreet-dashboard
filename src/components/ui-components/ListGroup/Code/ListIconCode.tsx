
import CodeModal from "../../CodeModal";

const ListIconCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { ListGroup, ListGroupItem } from "flowbite-react";
    import { HiCloudDownload, HiInbox, HiOutlineAdjustments, HiUserCircle } from "react-icons/hi";
    
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
                `}
      </CodeModal>
    </div>
  );
};

export default ListIconCode;
