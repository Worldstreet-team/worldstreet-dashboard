"use client";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import { HR, HRText } from "flowbite-react";

interface MyAppProps {
  title?: string;
}

const SocialButtons: React.FC<MyAppProps> = ({ title }) => {
  return (
    <>
      <div className="flex justify-between gap-8">
        <Link
          href={"/"}
          className="px-4 py-2.5 border border-gray-950/10 flex gap-2 items-enter w-full rounded-md text-center justify-center text hover:text-primary"
        >
          <Image src="/images/svgs/google-icon.svg" alt="google" height={18} width={18} /> Google
        </Link>
        <Link
          href={"/"}
          className="px-4 py-2.5 border border-gray-950/10 flex gap-2 items-enter w-full rounded-md text-center justify-center hover:text-primary"
        >
          <Image src="/images/svgs/icon-facebook.png" alt="google" height={18} width={18} />
          Facebook
        </Link>
      </div>
      {/* Divider */}
      <HRText text={`${title}`} className="border-t! border-gray-950/10 w-full" />
    </>
  );
};

export default SocialButtons;
