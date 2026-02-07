import FormsCustom from "@/components/form-components/FormsCustom";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Form Custom",
  },
];

const FormCustom = () => {
  return (
    <>
      <BreadcrumbComp title="Form Custom" items={BCrumb} />
      <FormsCustom />
    </>
  )
}

export default FormCustom