"use client"
import CardBox from "@/components/shared/CardBox";
import { TabItem, Tabs } from 'flowbite-react'
import TabsPillcode from './Code/TabsPillcode';

const TabsWithPill = () => {
  return (
    <div>
        <CardBox>
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Tabs With Pills</h4>
             <TabsPillcode/>
          </div>
          <div className='mt-2'>
            <Tabs aria-label="Pills" >
              <TabItem active title="Tab 1" className='rounded-t-lg'>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content 1
                </p>
              </TabItem>
              <TabItem title="Tab 2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content 2
                </p>
              </TabItem>
              <TabItem title="Tab 3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content 3
                </p>
              </TabItem>
              <TabItem title="Tab 4"> 
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content 4
                </p>
              </TabItem>
              <TabItem disabled title="Tab 5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Content 5
                </p>
              </TabItem>
            </Tabs>
          </div>
        </CardBox>
    </div>
  )
}

export default TabsWithPill
