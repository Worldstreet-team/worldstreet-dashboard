
import Image from "next/image";
import React from "react";
import { Button } from "flowbite-react";
import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Maintenance | WorldStreet",
  description: "WorldStreet - Trade Forex and Crypto",
};
const Maintenance = () => {
  return (
    <>
      <div className="h-screen flex items-center  justify-center bg-white dark:bg-dark">
        <div className="text-center">
          <Image src="/images/backgrounds/maintenance.svg" alt="error" className="mb-4" width={500} height={500} />
          <h1 className="text-ld text-4xl mb-6">Maintenance Mode!!!</h1>
          <h6 className="text-xl text-ld">Website is Under Construction. Check back later!</h6>
          <Button color={"primary"} as={Link} href="/" className="w-fit mt-6 mx-auto rounded-md">
            Go Back to Home
          </Button>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
