
import CodeModal from "../../CodeModal";

const LinkListCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { ListGroup, ListGroupItem } from "flowbite-react";
    
    <ListGroup>
      <ListGroupItem href="#" active>
        Profile
      </ListGroupItem>
      <ListGroupItem href="#">Settings</ListGroupItem>
      <ListGroupItem href="#">Messages</ListGroupItem>
      <ListGroupItem href="#">Download</ListGroupItem>
    </ListGroup>
                `}
      </CodeModal>
    </div>
  );
};

export default LinkListCode;
