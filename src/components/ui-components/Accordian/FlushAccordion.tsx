
import CardBox from "@/components/shared/CardBox";
import { Accordion, AccordionContent, AccordionPanel, AccordionTitle } from "flowbite-react";
import FlushAccordiancode from "./Code/FlushAccordiancode";

const FlushAccordian = () => {
  return (
    <>
      <CardBox>
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Accordian Flush</h4>
          <FlushAccordiancode />
        </div>
        <Accordion collapseAll>
          <AccordionPanel>
            <AccordionTitle className="focus:ring-0 border-b border-border dark:border-darkborder">
              Accordion Item #1
            </AccordionTitle>
            <AccordionContent>
              <p>
                Contrary to popular belief, Lorem Ipsum is not simply random
                text. It has roots in a piece of classical Latin literature from
                45 BC, making it over 2000 years old.
              </p>
            </AccordionContent>
          </AccordionPanel>
          <AccordionPanel>
            <AccordionTitle className="focus:ring-0 border-b border-border dark:border-darkborder">
              Accordion Item #2
            </AccordionTitle>
            <AccordionContent>
              <p>
                Contrary to popular belief, Lorem Ipsum is not simply random
                text. It has roots in a piece of classical Latin literature from
                45 BC, making it over 2000 years old.
              </p>
            </AccordionContent>
          </AccordionPanel  >
          <AccordionPanel >
            <AccordionTitle>
              Accordion Item #3
            </AccordionTitle>
            <AccordionContent>
              <p>
                Contrary to popular belief, Lorem Ipsum is not simply random
                text. It has roots in a piece of classical Latin literature from
                45 BC, making it over 2000 years old.
              </p>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </CardBox>
    </>
  );
};

export default FlushAccordian;
