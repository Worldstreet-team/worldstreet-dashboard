"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
const FullLogo = () => {
  return (
    <Link href={"/"}>
      {/* Dark Logo (for light mode) */}
      <Image
        src="/worldstreet-logo/WorldStreet4x.png"
        alt="WorldStreet"
        className="block dark:hidden rtl:scale-x-[-1]"
        width={50}
        height={32}
      />
      {/* Light Logo (for dark mode) */}
      <Image
        src="/worldstreet-logo/WorldStreet4x.png"
        alt="WorldStreet"
        className="hidden dark:block rtl:scale-x-[-1]"
        width={50}
        height={32}
      />
    </Link>
  );
};

export default FullLogo;
