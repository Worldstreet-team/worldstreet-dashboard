"use client"
import { Footer, FooterCopyright, FooterLink, FooterLinkGroup } from "flowbite-react";
import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";

const DefaultFooter = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold ">Default Footer</h4>
          <CodeModal>
            {`
    import { Footer, FooterCopyright, FooterLink, FooterLinkGroup } from "flowbite-react";

    <Footer container className="rounded-md">
      <FooterCopyright href="#" by="MateriaIM" year={2024} />
      <FooterLinkGroup>
        <FooterLink href="#">About</FooterLink>
        <FooterLink href="#">Privacy Policy</FooterLink>
        <FooterLink href="#">Licensing</FooterLink>
        <FooterLink href="#">Contact</FooterLink>
      </FooterLinkGroup>
    </Footer>
                `}
          </CodeModal>
        </div>
        <Footer container className="rounded-md">
          <FooterCopyright href="#" by="MateriaIM" year={2024} />
          <FooterLinkGroup>
            <FooterLink href="#">About</FooterLink>
            <FooterLink href="#">Privacy Policy</FooterLink>
            <FooterLink href="#">Licensing</FooterLink>
            <FooterLink href="#">Contact</FooterLink>
          </FooterLinkGroup>
        </Footer>
      </CardBox>
    </div>
  );
};

export default DefaultFooter;
