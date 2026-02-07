import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import CheckBoxTable from '@/components/tables/checkbox'

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Checkbox Table",
  },
];

const CheckboxTables = () => {

  return (
    <>
      <BreadcrumbComp title="Checkbox Table" items={BCrumb} />
      <CheckBoxTable />
    </>
  );
};

export default CheckboxTables;
