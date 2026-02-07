"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import * as SearchData from "./Data";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

const Search = () => {
  const [openBox, setOpenBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("a");

  const filteredLinks = SearchData.SearchLinks.filter((link) =>
    link.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let typedValue = e.target.value;
    setSearchQuery(typedValue);
    setOpenBox(true);
  }

  return (
    <div className="relative" >
      <button
        aria-label="Open search modal"
        className="text-black cursor-pointer relative w-80"
      >
        <input
          type="text"
          name="search"
          id="search"
          onBlur={() => setOpenBox(false)}
          onChange={handleChange}
          placeholder="Search"
          className="border border-border rounded-md py-2 dark:text-white ps-10 bg-transparent dark:border-darkborder dark:focus:border-primary focus:border-primary dark:font-normal focus:ring-offset-0 focus:ring-0 focus:shadow-none w-full dark:caret-white"
        />
        <div className="absolute top-2 left-3">
          <Icon icon="tabler:search" height={20} className="dark:text-darklink text-dark/50" />
        </div>
      </button>
      <div className={`absolute top-14 left-0 shadow-md w-full transition-opacity bg-white dark:bg-black ${openBox ? 'block' : "hidden"}`}>
        <SimpleBar className="max-h-72">
          <h5 className="text-lg border-b border-border dark:border-darkborder py-3 px-4">Quick Page Links</h5>
          <div className={`${filteredLinks.length > 0 ? 'py-0' : 'py-3'} px-4`}>
            {/* Map through the filtered links */}
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link, index) => (
                <Link
                  href={link.href}
                  className="py-1 px-3 group relative"
                  key={index}
                >
                  <h6 className="group-hover:text-primary mb-1 font-medium text-sm">
                    {link.title}
                  </h6>
                  <p className="text-xs text-link dark:text-darklink opacity-90 font-medium">
                    {link.href}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-center text-sm text-gray-500">
                No results found
              </p>
            )}
          </div>
        </SimpleBar>
      </div>
    </div>
  );
};

export default Search;
