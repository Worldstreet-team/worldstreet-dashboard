"use client";
import React, { useContext, useEffect } from "react";
import i18n from "@/utils/i18n";
import { useTranslation } from "react-i18next";
import { CustomizerContext } from "@/app/context/customizerContext";
import Image from "next/image";
import { Dropdown, DropdownItem } from "flowbite-react";

const Languages = [
  {
    flagname: "English (UK)",
    icon: "/images/flag/icon-flag-en.svg",
    value: "en",
  },
  {
    flagname: "中国人 (Chinese)",
    icon: "/images/flag/icon-flag-cn.svg",
    value: "ch",
  },
  {
    flagname: "français (French)",
    icon: "/images/flag/icon-flag-fr.svg",
    value: "fr",
  },

  {
    flagname: "عربي (Arabic)",
    icon: "/images/flag/icon-flag-sa.svg",
    value: "ar",
  },
];

export const Language = () => {
  const { i18n } = useTranslation();

  const { isLanguage, setIsLanguage } = useContext(CustomizerContext);
  const currentLang =
    Languages.find((_lang) => _lang.value === isLanguage) || Languages[1];

  useEffect(() => {
    i18n.changeLanguage(isLanguage);
  }, [isLanguage]);
  return (
    <>
      <div className="relative group/menu">
        <Dropdown
          label=""
          className="w-56 rounded-sm"
          dismissOnClick={false}
          renderTrigger={() => (
            <span className="relative w-10 h-10 hover:bg-primary/20 rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-primary/20 ">
              <Image
                src={currentLang.icon}
                alt="language"
                className="rounded-sm h-[18px] w-6 shrink-0 object-cover cursor-pointer"
                width={24}
                height={18}
              />
            </span>
          )}
        >
          {Languages.map((item, index) => (
            <DropdownItem
              className="flex gap-3 items-center py-3 px-6 bg-hover group w-full"
              key={index}
              onClick={() => setIsLanguage(item.value)}
            >
              <Image
                src={item.icon}
                alt="flag"
                className="rounded-full object-cover h-5 w-5"
                width={24}
                height={18}
              />
              <span className="text-sm text-muted dark:text-darklink group-hover:text-primary font-medium leading-[25px]" >{item.flagname}</span>
            </DropdownItem>
          ))}
        </Dropdown>
      </div>
    </>
  );
};
