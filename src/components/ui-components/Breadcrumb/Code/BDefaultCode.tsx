
import CodeModal from "../../CodeModal";

const BDefaultCode = () => {
  return (
    <div>
      <CodeModal>
        {`  
    import { Breadcrumb, BreadcrumbItem } from "flowbite-react";
    import { HiHome } from "react-icons/hi";
    
    <Breadcrumb aria-label="Default breadcrumb example" className="justify-start! w-auto!">
      <BreadcrumbItem href="#" icon={HiHome}>
        Home
      </BreadcrumbItem>
      <BreadcrumbItem href="#">Projects</BreadcrumbItem>
      <BreadcrumbItem>matdash IM</BreadcrumbItem>
    </Breadcrumb>
                `}
      </CodeModal>
    </div>
  );
};

export default BDefaultCode;
