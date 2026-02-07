export const ColorConfiguration = () => {
  return (
    <>
      <h3 className=" text-black text-xl font-semibold mt-8 dark:text-white">
        Layout
      </h3>
      <div className="p-6 rounded-md mt-4 border border-gray-950/10 dark:border-darkborder">
        <p className="text-base font-medium text-midnight_text dark:text-white dark:text-opacity-50">
          <span className="font-semibold text-lg dark:text-white">
            Colors Configuration
          </span>
          <br />
          For any change in default Color :
          /src/app/css/theme/default-colors.css
        </p>
        <div className="py-4 px-5 rounded-md bg-black mt-8">
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>:root &#123;</span>
            <span>--color-info: #539bff;</span>
            <span>--color-success: #22C55E;</span>
            <span>--color-warning: #F59E0B;</span>
            <span>--color-error: #EF4444;</span>
            <span>--color-lightsuccess: #13DEB920;</span>
            <span>--color-lighterror: #FA896B20;</span>
            <span>--color-darkinfo: #223662;</span>
            <span>--color-lightwarning: #FFAE1F20;</span>
            <span>--color-white: #fff;</span>
            <span>--color-dark: #17192C;</span>
            <span>--color-black: #0E1025;</span>
            <span>--color-border: #0e10251a;</span>
            <span>--color-darkborder: #333f55;</span>
            <span>--color-link: #2a3547;</span>
            <span>--color-muted: #5a6a85;</span>
            <span>--color-darklink: #7c8fac;</span>
            <span>--color-lightgray: #f6f9fc;</span>
            <span>--color-darkgray: #333f55;</span>
            <span>--color-bodytext: #5a6a85bf;</span>
            <span>--color-error-emphasis: #c93232;</span>
            <span>--color-warning-emphasis: #d9941a;</span>
            <span>--color-success-emphasis: #189245;</span>
            <span>--color-cyan: #3DD9EB;</span>
            <span>--color-darkcyan: #174FEB;</span>
            <span>--color-pink: #EC4899;</span>
            <span>--color-info-emphasis: #3184f7;</span>
            <span>--color-herobg: #e4e6f16b;</span>
            <span>&#125;</span>
          </p>
        </div>
      </div>
      <div className="p-6 rounded-md mt-4 border border-gray-950/10 dark:border-darkborder">
        <p className="text-base font-medium text-midnight_text dark:text-white dark:text-opacity-50">
          <span className="font-semibold text-lg dark:text-white">
            Colors Configuration
          </span>
          <br />
          For any change in default theme Color :
          /src/app/css/theme/default-colors.css
        </p>
        <div className="py-4 px-5 rounded-md bg-black mt-8">
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="BLUE_THEME"&#93; &#123;</span>
            <span>--color-primary: #0e98d8;</span>
            <span>--color-primary-emphasis: #0a73a3;</span>
            <span>--color-secondary: #5E88FE;</span>
            <span>--color-secondary-emphasis: #395ec2;</span>
            <span>--color-primary/20: #3ea2d933;</span>
            <span>--color-lightsecondary: #49BEFF20;</span>
            <span>&#125;</span>
          </p>
          <br />
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="AQUA_THEME"&#93; &#123;</span>
            <span>--color-primary: #0074BA;</span>
            <span>--color-bghover: #00639e;</span>
            <span>--color-primary-emphasis: #00639e;</span>
            <span>--color-secondary-emphasis: #3cb7a0;</span>
            <span>--color-secondary: #47D7BC;</span>
            <span>--color-primary/20: #0074BA20;</span>
            <span>--color-lightsecondary: #00639e20;</span>
            <span>&#125;</span>
          </p>
          <br />
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="PURPLE_THEME"&#93; &#123;</span>
            <span>--color-primary: #763EBD;</span>
            <span>--color-primary-emphasis: #6435a1;</span>
            <span>--color-secondary-emphasis: #7fb0b5;</span>
            <span>--color-secondary: #49BEFF;</span>
            <span>--color-primary/20: #763EBD20;</span>
            <span>--color-lightsecondary: #49BEFF20;</span>
            <span>&#125;</span>
          </p>
          <br />
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="GREEN_THEME"&#93; &#123;</span>
            <span>--color-primary: #0A7EA4;</span>
            <span>--color-primary-emphasis: #096b8b;</span>
            <span>--color-secondary-emphasis: #d4e069;</span>
            <span>--color-secondary: #CCDA4E;</span>
            <span>--color-primary/20: #0A7EA420;</span>
            <span>--color-lightsecondary: #CCDA4E20;</span>
            <span>&#125;</span>
          </p>
          <br />
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="CYAN_THEME"&#93; &#123;</span>
            <span>--color-primary: #01C0C8;</span>
            <span>--color-primary-emphasis: #01a3aa;</span>
            <span>--color-secondary-emphasis: #d58066;</span>
            <span>--color-secondary: #FB9678;</span>
            <span>--color-primary/20: #01C0C820;</span>
            <span>--color-lightsecondary: #FB967820;</span>
            <span>&#125;</span>
          </p>
          <br />
          <p className="text-sm text-gray-400 flex flex-col gap-2">
            <span>&#91;data-color-theme="ORANGE_THEME"&#93; &#123;</span>
            <span>--color-primary: #FA896B;</span>
            <span>--color-primary-emphasis: #d5745b;</span>
            <span>--color-secondary-emphasis: #00639e;</span>
            <span>--color-secondary: #0074BA;</span>
            <span>--color-primary/20: #FA896B20;</span>
            <span>--color-lightsecondary: #0074BA20;</span>
            <span>&#125;</span>
          </p>
        </div>
      </div>
    </>
  );
};
