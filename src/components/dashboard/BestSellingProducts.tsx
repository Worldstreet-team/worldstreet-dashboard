import Image from "next/image";


const BestSellingProducts = () => {
  return (
    <div className="bg-[url('/images/backgrounds/best-selling-products-bg-color.png')] bg-no-repeat bg-cover h-full rounded-md dark:shadow-dark-md shadow-md p-6 flex flex-col gap-4">
      <div>
        <h5 className="text-lg font-semibold text-white">
          Top Performing Assets
        </h5>
        <p className="text-sm text-white opacity-60">24h performance</p>
      </div>
      <div className="bg-[url('/images/backgrounds/best-selling-products-bg.png')] flex-1 bg-no-repeat bg-center bg-contain flex flex-col justify-end">
        <div className="bg-white dark:bg-black p-4 rounded-md -mx-2">
          <div className="mb-4">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-3">
                <div className="border border-gray-950/10 dark:border-darkborder flex justify-center items-center w-10 h-10 rounded-sm">
                  <span className="text-lg font-bold text-primary">₿</span>
                </div>
                <div className="">
                  <h4 className="dark:text-white text-black text-xs font-medium mb-1">
                    Bitcoin (BTC)
                  </h4>
                  <p className="dark:text-white dark:opacity-40 text-xs">
                    $43,568
                  </p>
                </div>
              </div>
              <div className="bg-primaryemphasis text-xs font-medium px-2 py-1 text-white rounded-sm">
                +5.2%
              </div>
            </div>
            <div className="pl-14">
              <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-white dark:bg-opacity-5 ">
                <div className="bg-primary h-1.5 rounded-full w-3/4"></div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-start gap-3">
                <div className="border border-gray-950/10 dark:border-darkborder flex justify-center items-center w-10 h-10 rounded-sm">
                  <span className="text-lg font-bold text-secondary">Ξ</span>
                </div>
                <div>
                  <h4 className="dark:text-white text-xs font-medium mb-1">
                    Ethereum (ETH)
                  </h4>
                  <p className="dark:text-white dark:opacity-40 text-xs">
                    $2,345
                  </p>
                </div>
              </div>
              <div className="bg-secondaryemphasis px-2 py-1 text-white text-xs rounded-sm">
                +3.8%
              </div>
            </div>
            <div className="pl-14">
              <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-white dark:bg-opacity-5 ">
                <div className="bg-secondary h-1.5 rounded-full w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellingProducts;
