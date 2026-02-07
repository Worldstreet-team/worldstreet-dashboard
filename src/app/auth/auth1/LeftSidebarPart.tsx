"use client";
import Image from "next/image";
import React from "react";

const LeftSidebarPart = () => {
  return (
    <>
      <div className="flex justify-center h-screen items-center z-10 relative">
        <div className="xl:px-0 px-6 w-1/2">
          <Image src="/images/backgrounds/login-security.svg" alt="auth-bg" className="w-full" width={700} height={700} />
        </div>
      </div>
    </>
  );
};

export default LeftSidebarPart;
