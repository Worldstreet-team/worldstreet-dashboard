
import CodeModal from "../../CodeModal";

const ListButtonCode = () => {
  return (
    <div>
      <CodeModal>
        {`
    import { ListGroup, ListGroupItem } from "flowbite-react";

    <ListGroup>
      <ListGroupItem
        onClick={() => alert("Profile clicked!")}
        active
      >
        Profile
      </ListGroupItem>
      <ListGroupItem>Settings</ListGroupItem>
      <ListGroupItem>Messages</ListGroupItem>
      <ListGroupItem>Download</ListGroupItem>
    </ListGroup>
                `}
      </CodeModal>
    </div>
  );
};

export default ListButtonCode;
