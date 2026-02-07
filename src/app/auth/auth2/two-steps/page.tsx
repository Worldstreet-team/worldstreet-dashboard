import CardBox from "@/components/shared/CardBox";
import React from "react";
import Link from "next/link";
import AuthTwoSteps from "../../authforms/AuthTwoSteps";
import type { Metadata } from "next";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";
export const metadata: Metadata = {
  title: "Two-Step Verification | WorldStreet",
  description: "WorldStreet - Trade Forex and Crypto",
};
const BoxedTwoStep = () => {
  return (
    <>
      <div className="relative overflow-hidden h-screen bg-primary/20 dark:bg-darkprimary">
        <div className="flex h-full justify-center items-center px-4">
          <CardBox className="md:w-[450px] w-full h-auto border-none">
            <div className="mx-auto mb-6">
              <FullLogo />
            </div>
            <p className="text-darklink text-sm font-medium text-center">
              We sent a verification code to your mobile. Enter the code from
              the mobile in the field below.
            </p>
            <h6 className="text-sm font-bold text-center">******1234</h6>
            <AuthTwoSteps />
            <div className="flex gap-2 text-base text-ld font-medium mt-6 items-center justify-left">
              <p>Didn't get the code?</p>
              <Link href={"/"} className="text-primary text-sm font-medium hover:text-primaryemphasis">
                Resend
              </Link>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  );
};

export default BoxedTwoStep;
