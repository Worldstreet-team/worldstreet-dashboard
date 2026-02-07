import { createTheme } from "flowbite-react";

const CustomSidebarTheme = createTheme({
    root: {
        inner:
            "bg-white dark:bg-black rounded-none w-[270px] border border-border dark:border-darkborder p-0",
    },
    item: {
        base: "flex items-center justify-center rounded-md p-2.5 mb-0.5 gap-3 !text-base text-start leading-[normal] font-normal text-link hover:bg-lightprimary hover:text-primary dark:text-darklink  dark:hover:text-primary",
        content: {
            base: "flex-1 whitespace-nowrap px-0 leading-21",
        },
        active: "bg-primary !text-white dark:bg-primary !dark:text-primary",
    },
    collapse: {
        button:
            "group flex gap-3 items-center rounded-md p-2.5 mb-0.5 text-base text-start truncate leading-[normal] font-normal text-link hover:bg-lightprimary hover:text-primary dark:text-darklink w-full dark:hover:text-primary cursor-pointer collapse-menu",
        icon: {
            base: "h-6 w-6 text-link text-base",
        },
        label: {
            base: "flex justify-start flex-1 max-w-36 overflow-hidden truncate leading-21 ml-0",
        },
    },
    itemGroup: {
        base: "mt-4 space-y-0 border-t border-ld pt-4 first:mt-0 first:border-t-0 first:pt-0 sidebar-nav ",
    },
})

export default CustomSidebarTheme;