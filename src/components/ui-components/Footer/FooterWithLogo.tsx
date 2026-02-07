"use client"
import { Footer, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";

import CardBox from "@/components/shared/CardBox";
import CodeModal from "../CodeModal";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";

const FooterWithLogo = () => {
  return (
    <div>
      <CardBox>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold">Footer With Logo</h4>
          <CodeModal>
            {`
    import { Footer, FooterCopyright, FooterDivider, FooterLink, FooterLinkGroup } from "flowbite-react";
    
    <Footer container className="rounded-md">
      <div className="w-full text-center">
        <div className="w-full justify-between sm:flex sm:items-center sm:justify-between">
          <FullLogo/>
          <FooterLinkGroup>
            <FooterLink href="#">About</FooterLink>
            <FooterLink href="#">Privacy Policy</FooterLink>
            <FooterLink href="#">Licensing</FooterLink>
            <FooterLink href="#">Contact</FooterLink>
          </FooterLinkGroup>
        </div>
        <FooterDivider />
        <FooterCopyright href="#" by="MateriaIM" year={2024} />
      </div>
    </Footer>
                `}
          </CodeModal>
        </div>
        <Footer container className="rounded-md">
          <div className="w-full text-center">
            <div className="w-full justify-between sm:flex sm:items-center sm:justify-between">
              <FullLogo />
              <FooterLinkGroup>
                <FooterLink href="#">About</FooterLink>
                <FooterLink href="#">Privacy Policy</FooterLink>
                <FooterLink href="#">Licensing</FooterLink>
                <FooterLink href="#">Contact</FooterLink>
              </FooterLinkGroup>
            </div>
            <FooterDivider />
            <FooterCopyright href="#" by="MateriaIM" year={2024} />
          </div>
        </Footer>
      </CardBox>
    </div>
  );
};

export default FooterWithLogo;
