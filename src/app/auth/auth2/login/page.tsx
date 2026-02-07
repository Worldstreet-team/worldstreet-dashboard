import CardBox from "@/components/shared/CardBox";
import React from "react";
import SocialButtons from "../../authforms/SocialButtons";
import AuthLogin from "../../authforms/AuthLogin";
import Link from "next/link";
import type { Metadata } from "next";
import FullLogo from "@/app/(DashboardLayout)/layout/shared/logo/FullLogo";
export const metadata: Metadata = {
  title: "Login | WorldStreet",
  description: "WorldStreet - Trade Forex and Crypto",
};
const BoxedLogin = () => {
  return (
    <>
      <div className="relative overflow-hidden h-screen bg-primary/20 dark:bg-darkprimary">
        <div className="flex h-screen justify-center items-center px-4">
          <CardBox className="md:w-[450px] w-full h-auto border-none">
            <div className="mx-auto mb-6">
              <FullLogo />
            </div>
            <SocialButtons title="or sign in with" />
            <AuthLogin />
            <div className="flex gap-2 text-base text-ld font-medium mt-6 items-center justify-center">
              <p>New to WorldStreet?</p>
              <Link
                href={"/auth/auth2/register"}
                className="text-primary text-sm font-medium hover:text-primaryemphasis"
              >
                Create an account
              </Link>
            </div>
          </CardBox>
        </div>
      </div>
    </>
  );
};

export default BoxedLogin;
