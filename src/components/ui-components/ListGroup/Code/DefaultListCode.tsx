
import CodeModal from "../../CodeModal";

const DefaultListcode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { ListGroup, ListGroupItem } from "flowbite-react";
    
    <ListGroup>
      <ListGroupItem>Profile</ListGroupItem>
      <ListGroupItem>Settings</ListGroupItem>
      <ListGroupItem>Messages</ListGroupItem>
      <ListGroupItem disabled>Download</ListGroupItem>
    </ListGroup>
                `}
      </CodeModal>
    </div>
  );
};

export default DefaultListcode;
