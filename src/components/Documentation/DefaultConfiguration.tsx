export const DefaultConfiguration = () => {
  return (
    <>
      <h3 className=" text-black text-xl font-semibold mt-8 dark:text-white">
        Layout
      </h3>
      <div className="p-6 rounded-md mt-4 border border-gray-950/10 dark:border-darkborder">
        <p className="text-base font-medium text-midnight_text dark:text-white dark:text-opacity-50">
          <span className="font-semibold text-lg dark:text-white">
            Default Setting
          </span>{" "}
          <br />
          For any change in default layout : /src/app/context/config.ts
        </p>
        <div className="py-4 px-5 rounded-md bg-black mt-8">
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>activeDir: "ltr", // This can be ltr or rtl</span>
            <span>activeMode: "light", // This can be light or dark</span>
            <span>
              activeTheme: "BLUE_THEME", // BLUE_THEME, GREEN_THEME, AQUA_THEME,
              PURPLE_THEME, ORANGE_THEME
            </span>
            <span>
              activeLayout: "vertical", // This can be vertical or horizontal
            </span>
            <span>isLayout: "boxed", // This can be full or boxed</span>
            <span>isSidebarHover: false,</span>
            <span>isCollapse:"full-sidebar",</span>
            <span>isLanguage: "en",</span>
            <span>isCardShadow: true,</span>
            <span>isMobileSidebar: false,</span>
            <span>isHorizontal: false,</span>
            <span>isBorderRadius: 7,</span>
            <span>sidebarWidth: 320,</span>
            <span>miniSidebarWidth: 87,</span>
            <span>topbarHeight: 70,</span>
          </p>
        </div>
      </div>
    </>
  );
};
