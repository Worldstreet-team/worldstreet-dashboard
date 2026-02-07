"use client";
import { Icon } from "@iconify/react";
import Image, { StaticImageData } from "next/image";
import React, { useState } from "react";
import { Badge, Button, Drawer } from "flowbite-react";
import SimpleBar from "simplebar-react";
import product1 from "/public/images/products/s4.jpg";
import product2 from "/public/images/products/s5.jpg";
import product3 from "/public/images/products/s7.jpg";
import Link from "next/link";

const CartItems = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prodQuant1, SetProdQuant1] = useState(5);
  const [prodQuant2, SetProdQuant2] = useState(2);
  const [prodQuant3, SetProdQuant3] = useState(4);

  const handleClose = () => setIsOpen(false);

  const handleQuantity = (productType: string, actionType: string) => {
    if (productType === "product1") {
      if (actionType === "inc") {
        SetProdQuant1(prodQuant1 + 1);
      } else {
        if (prodQuant1 > 0) {
          SetProdQuant1(prodQuant1 - 1);
        }
      }
    } else if (productType === "product2") {
      if (actionType === "inc") {
        SetProdQuant2(prodQuant2 + 1);
      } else {
        if (prodQuant2 > 0) {
          SetProdQuant2(prodQuant2 - 1);
        }
      }
    } else {
      if (actionType === "inc") {
        SetProdQuant3(prodQuant3 + 1);
      } else {
        if (prodQuant3 > 0) {
          SetProdQuant3(prodQuant3 - 1);
        }
      }
    }
  };

  interface cartProductProps {
    key: string;
    img: StaticImageData;
    title: string;
    desc: string;
    price: string;
    quantity: number;
    productType: string;
  }

  const CartProducts: cartProductProps[] = [
    {
      key: "prod1",
      img: product1,
      title: "Supreme toys cooker",
      desc: "Kitchenware Item",
      price: "$250",
      quantity: prodQuant1,
      productType: "product1",
    },
    {
      key: "prod2",
      img: product2,
      title: "Supreme toys cooker",
      desc: "Kitchenware Item",
      price: "$250",
      quantity: prodQuant2,
      productType: "product2",
    },
    {
      key: "prod3",
      img: product3,
      title: "Supreme toys cooker",
      desc: "Kitchenware Item",
      price: "$250",
      quantity: prodQuant3,
      productType: "product3",
    },
  ];

  return (
    <>
      <div className="relative group">
        {/* Desktop and large screen icon */}
        <div className="xl:flex w-10 h-10 hidden  rounded-full text-link dark:text-darklink relative after:rounded-md after:absolute pb-0.5 justify-center items-center cursor-pointer group-hover:bg-primary/20 group-hover:text-primary">
          <Icon icon="ph:shopping-cart-duotone" height={21} />
        </div>

        {/* Mobile icon */}
        <span
          className="xl:hidden text-link dark:text-darklink flex rounded-full px-[15px] pb-0.5 justify-center items-center cursor-pointer group-hover:text-primary"
          onClick={() => setIsOpen(true)}
        >
          <Icon
            icon="ph:shopping-cart-duotone"
            className="shrink-0"
            height={20}
          />
        </span>

        {/* Dropdown for smaller screens */}
        <div className="sm:w-[350px] w-screen dropdown top-9 right-0 invisible group-hover:visible cart-dropdown absolute">
          <Drawer
            open={isOpen}
            onClose={handleClose}
            position="right"
            className="xl:relative xl:transform-none xl:h-auto xl:bg-transparent xl:z-0 xl:w-[350px] w-64"
          >
            <SimpleBar className="md:h-auto h-[calc(100vh_-_50px)]">
              <div className="relative z-1 overflow-hidden before:absolute before:w-32 before:h-32 before:bg-primary before:rounded-full before:-z-1 before:blur-[80px] before:-right-10 before:-top-10 before:opacity-25 after:opacity-25 after:absolute after:w-32 after:h-32 after:bg-warning after:rounded-full after:-z-1 after:blur-[80px] after:-bottom-10 after:-left-10">
                <div className="py-6 px-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Shopping Cart</h3>
                  <Badge color={"secondary"} className="text-sm">
                    5 new
                  </Badge>
                </div>
                <div className="px-6 pb-6">
                  {CartProducts.map((item) => (
                    <div className="mb-4 flex gap-4" key={item.key}>
                      <div className="w-16 h-16">
                        <Image
                          src={item.img}
                          alt="product"
                          className="rounded-md"
                        />
                      </div>
                      <div className="">
                        <h4 className="text-sm font-medium mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-bodytext dark:text-darklink">
                          {item.desc}
                        </p>
                        <div className="flex mt-3 items-center justify-between">
                          <p className="font-semibold text-xs text-bodytext dark:text-darklink">
                            {item.price}
                          </p>
                          <div className="flex">
                            <button
                              onClick={() =>
                                handleQuantity(item.productType, "dec")
                              }
                              className="w-5 h-5 bg-lightsuccess hover:bg-success hover:text-white text-success flex cursor-pointer justify-center items-center rounded-l-md rtl:rounded-r-md rtl:rounded-l-none"
                            >
                              <Icon icon="tabler:minus" width={12} />
                            </button>
                            <div className="w-8 h-5 flex items-center justify-center font-semibold text-xs text-bodytext dark:text-darklink">
                              {item.quantity}
                            </div>
                            <button
                              onClick={() =>
                                handleQuantity(item.productType, "inc")
                              }
                              className="w-5 h-5 bg-lightsuccess text-success hover:bg-success hover:text-white flex cursor-pointer justify-center items-center rounded-r-md rtl:rounded-l-md rtl:rounded-r-none"
                            >
                              <Icon icon="tabler:plus" width={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center mb-6">
                    <p className="font-normal text-sm text-link dark:text-darklink">
                      Sub Total
                    </p>
                    <span className="font-semibold text-sm text-link dark:text-darklink">
                      $2530
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <p className="font-normal text-sm text-link dark:text-darklink">
                      Total
                    </p>
                    <span className="font-semibold text-sm text-link dark:text-darklink">
                      $6830
                    </span>
                  </div>

                  <Button
                    color={"outlineprimary"}
                    as={Link}
                    href="/auth/auth1/login"
                    className="w-full rounded-md text-sm"
                  >
                    Go to shopping cart
                  </Button>
                </div>
              </div>
            </SimpleBar>
          </Drawer>
        </div>
      </div>
    </>
  );
};

export default CartItems;
