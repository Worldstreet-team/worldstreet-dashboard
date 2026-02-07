export const LogoConfiguration = () => {
  return (
    <>
      <h3 className=" text-black text-xl font-semibold mt-8 dark:text-white">
        Logo
      </h3>
      <div className="p-6 rounded-md mt-4 border border-gray-950/10 dark:border-darkborder">
        <p className="text-base font-medium text-midnight_text dark:text-white dark:text-opacity-50 flex lg:flex-row flex-col">
          1. Change Logo over here :
          <span className="font-semibold text-base overflow-x-auto">
            src/app/layout/shared/logo/FullLogo.tsx
          </span>
        </p>
        <div className="py-4 px-3 rounded-md bg-black mt-8">
          <div className="text-sm text-gray-400">
            <p className="ms-2">
              import Logo from "/public/images/logos/dark-logo.svg";
            </p>
            <p className="ms-2">
              import Logowhite from "/public/images/logos/light-logo.svg";
            </p>
            <br />
            <p>&#x3C;Link href=&#x22;/&#x22;&#x3E;</p>
            <p className="ms-2">&#x3C;Image</p>
            <p className="ms-3">src=&#123;Logo&#125;</p>
            <p className="ms-3">alt=&#x22;logo&#x22;</p>
            <p className="ms-3">
              className=&#x27;block dark:hidden rtl:scale-x-[-1]&#x27;
            </p>
            <p>/&#x3E;</p>
            <p className="ms-2">&#x3C;Image</p>
            <p className="ms-5">src=&#123;Logowhite&#125;</p>
            <p className="ms-5">alt=&#x22;logo&#x22;</p>
            <p className="ms-5">
              className=&#x27;hidden dark:block rtl:scale-x-[-1]&#x27;
            </p>
            <p className="ms-2">/&#x3E;</p>
            <p className="ms-2">&#x3C;/Link&#x3E;</p>
          </div>
        </div>
      </div>
    </>
  );
};
