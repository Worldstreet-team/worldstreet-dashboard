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
  };

  return (
    <div className="relative">
      <button aria-label="Open search modal" className="text-dark dark:text-white cursor-pointer relative w-72">
        <input
          type="text"
          name="search"
          id="search"
          onBlur={() => setOpenBox(false)}
          onChange={handleChange}
          placeholder="Search..."
          className="border border-border rounded-lg py-2 dark:text-white ps-10 bg-muted/30 dark:bg-white/5 dark:border-darkborder dark:focus:border-primary focus:border-primary focus:ring-offset-0 focus:ring-0 focus:shadow-none w-full dark:caret-white text-sm placeholder:text-muted transition-colors duration-200"
        />
        <div className="absolute top-2.5 left-3">
          <Icon icon="tabler:search" height={18} className="text-muted" />
        </div>
      </button>
      <div
        className={`absolute top-12 left-0 w-full transition-all duration-200 ${
          openBox ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-white dark:bg-black rounded-lg shadow-lg border border-border dark:border-darkborder overflow-hidden">
          <SimpleBar className="max-h-72">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted border-b border-border dark:border-darkborder py-3 px-4">
              Quick Links
            </h5>
            <div className={`${filteredLinks.length > 0 ? "py-1" : "py-3"} px-2`}>
              {filteredLinks.length > 0 ? (
                filteredLinks.map((link, index) => (
                  <Link
                    href={link.href}
                    className="block py-2 px-3 rounded-md hover:bg-muted/50 dark:hover:bg-white/5 transition-colors duration-150 group"
                    key={index}
                  >
                    <h6 className="group-hover:text-primary text-sm font-medium text-dark dark:text-white transition-colors">
                      {link.title}
                    </h6>
                    <p className="text-xs text-muted mt-0.5">{link.href}</p>
                  </Link>
                ))
              ) : (
                <p className="text-center text-sm text-muted py-4">No results found</p>
              )}
            </div>
          </SimpleBar>
        </div>
      </div>
    </div>
  );
};

export default Search;
