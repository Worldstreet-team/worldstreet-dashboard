
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import React from "react";
import LeftSidebarPart from "../LeftSidebarPart";
import AuthForgotPassword from "../../authforms/AuthForgotPassword";
import { Button } from "flowbite-react";
import Link from "next/link";
import type { Metadata } from "next";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";

export const metadata: Metadata = {
  title: "Forgot Password | WorldStreet",
  description: "WorldStreet - Trade Forex and Crypto",
};


const Forgotpwd = () => {
  return (
    <>
      <div className="p-5 lg:bg-transparent lg:dark:bg-transparent bg-primary/20 lg:fixed top-0 z-50 w-full">
        <FullLogo />
      </div>
      <div className="relative overflow-hidden md:h-screen md:py-0 py-16">
        <div className="grid grid-cols-12 gap-3 bg-white dark:bg-dark">
          <div className="xl:col-span-8 lg:col-span-7 col-span-12 bg-primary/20 dark:bg-primary/20 lg:block hidden relative overflow-hidden">
            <LeftSidebarPart />
          </div>
          <div className="xl:col-span-4 lg:col-span-5 col-span-12 sm:px-12 p-5">
            <div className="flex md:h-screen items-center px-3 lg:justify-start justify-center">
              <div className="max-w-[420px] w-full mx-auto relative">
                <h3 className="text-2xl font-bold my-3">Forgot Password</h3>
                <p className="text-darklink text-sm font-medium mb-4">
                  Please enter the email address associated with your account
                  and We will email you a link to reset your password.
                </p>
                <AuthForgotPassword />
                <Button
                  color={"lightprimary"}
                  as={Link}
                  href="/auth/auth1/login"
                  className="w-full mt-4 rounded-md"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Forgotpwd;
