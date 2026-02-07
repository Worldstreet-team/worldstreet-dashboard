
import CardBox from "@/components/shared/CardBox";
import React from "react";
import Link from "next/link";
import AuthForgotPassword from "../../authforms/AuthForgotPassword";
import { Button } from "flowbite-react";
import type { Metadata } from "next";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";
export const metadata: Metadata = {
  title: "Forgot Password | WorldStreet",
  description: "WorldStreet - Trade Forex and Crypto",
};


const BoxedForgotpwd = () => {
  return (
    <>
      <div className="relative overflow-hidden h-screen bg-primary/20 dark:bg-darkprimary">
        <div className="flex h-full justify-center items-center px-4">
          <CardBox className="md:w-[450px] w-full h-auto border-none">
            <div className="mx-auto mb-6">
              <FullLogo />
            </div>
            <p className="text-darklink text-sm text-center">Please enter the email address associated with your account and We will email you a link to reset your password.</p>
            <AuthForgotPassword />
            <Button
              color={"lightprimary"}
              as={Link}
              href="/auth/auth2/login"
              className="rounded-md w-full"
            >
              Back to Login
            </Button>
          </CardBox>
        </div>
      </div>
    </>
  );
};

export default BoxedForgotpwd;
