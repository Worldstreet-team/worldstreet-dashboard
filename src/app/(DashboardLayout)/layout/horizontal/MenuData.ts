import { uniqueId } from "lodash";

const Menuitems = [

  {
    id: uniqueId(),
    title: "Home",
    icon: "tabler:",
    href: "",
    column: 0,
    children: [
      {
        title: "Modern",
        icon: 'ph:bag-duotone',
        id: uniqueId(),
        href: "/",
      },
    ],
  },
  {
    id: uniqueId(),
    title: "Ui Elements",
    icon: "ph:squares-four-duotone",
    column: 4,
    href: "",
    children: [
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Accordian",
        href: "/ui-components/accrodian",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Badge",
        href: "/ui-components/badge",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Button",
        href: "/ui-components/buttons",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Dropdowns",
        href: "/ui-components/dropdown",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Modals",
        href: "/ui-components/modals",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Tab",
        href: "/ui-components/tab",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Tooltip",
        href: "/ui-components/tooltip",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Alert",
        href: "/ui-components/alert",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Progressbar",
        href: "/ui-components/progressbar",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Pagination",
        href: "/ui-components/pagination",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Breadcrumbs",
        href: "/ui-components/breadcrumb",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Drawer",
        href: "/ui-components/drawer",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Lists",
        href: "/ui-components/listgroup",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Carousel",
        href: "/ui-components/carousel",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Spinner",
        href: "/ui-components/spinner",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Avatar",
        href: "/ui-components/avatar",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Banner",
        href: "/ui-components/banner",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Button Group",
        href: "/ui-components/button-group",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Card",
        href: "/ui-components/card",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Datepicker",
        href: "/ui-components/datepicker",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Footer",
        href: "/ui-components/footer",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "KBD",
        href: "/ui-components/kbd",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Mega Menu",
        href: "/ui-components/megamenu",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Navbar",
        href: "/ui-components/navbar",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Popover",
        href: "/ui-components/popover",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Rating",
        href: "/ui-components/rating",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Sidebar",
        href: "/ui-components/sidebar",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Tables",
        href: "/ui-components/tables",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Timeline",
        href: "/ui-components/timeline",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Toast",
        href: "/ui-components/toast",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Typography",
        href: "/ui-components/typography",
      },
    ],
  },
  {
    id: uniqueId(),
    title: "Tables",
    icon: "ph:sidebar-simple-duotone",
    href: "",
    children: [
      {
        title: "Basic Tables",
        icon: "ph:checkerboard-duotone",
        id: uniqueId(),
        href: "/tables/basic",
      },
      {
        title: "Striped Rows Table",
        icon: "ph:square-half-bottom-duotone",
        id: uniqueId(),
        href: "/tables/striped-row",
      },
      {
        title: "Hover Table",
        icon: "ph:check-square-duotone",
        id: uniqueId(),
        href: "/tables/hover-table",
      },
      {
        title: "Checkbox Table",
        icon: "ph:check-square-duotone",
        id: uniqueId(),
        href: "/tables/checkbox-table",
      },
    ],
  },
  {
    id: uniqueId(),
    title: "Forms",
    icon: "ph:files-duotone",
    href: "",
    children: [
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Forms Elements",
        href: "/forms/form-elements",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Forms Layouts",
        href: "/forms/form-layouts",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Forms Horizontal",
        href: "/forms/form-horizontal",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Forms Vertical",
        href: "/forms/form-vertical",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Forms Custom",
        href: "/forms/form-custom",
      },
      {
        id: uniqueId(),
        icon: "tabler:circle",
        title: "Form Validation",
        href: "/forms/form-validation",
      },
    ],
  },
  {
    id: uniqueId(),
    title: "Others",
    icon: "ph:stack-duotone",
    href: "",
    column: 0,
    children: [
      {
        title: "Menu Level",
        id: uniqueId(),
        icon: 'tabler:layers-subtract',
        href: "",
        children: [
          {
            id: uniqueId(),
            title: "Level 1",
            icon: "tabler:circle",
            href: "/l1",
          },
          {
            id: uniqueId(),
            title: "Level 1.1",
            icon: "tabler:circle",
            href: "/l1.1",
            children: [
              {
                id: uniqueId(),
                title: "Level 2",
                icon: "tabler:circle",
                href: "/l2",

              },
              {
                id: uniqueId(),
                title: "Level 2.1",
                icon: "tabler:circle",
                href: "/l2.1",

                children: [
                  {
                    id: uniqueId(),
                    title: "Level 3",
                    icon: "tabler:circle",
                    href: "/l3",
                  },
                  {
                    id: uniqueId(),
                    title: "Level 3.1",
                    icon: "tabler:circle",
                    href: "/l3.1",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Disabled",
        icon: 'tabler:ban',
        id: uniqueId(),
        href: "#",
        disabled: true
      },
      {
        title: "SubCaption",
        icon: 'tabler:star',
        id: uniqueId(),
        href: "#",
        disabled: false,
        subtitle: "This is the subtitle"
      },
      {
        title: "Chip",
        icon: 'tabler:award',
        id: uniqueId(),
        href: "#",
        badge: true,
        badgeType: "filled"
      },
      {
        title: "Outlined",
        icon: 'tabler:mood-smile',
        id: uniqueId(),
        href: "#",
        badge: true,
        badgeType: "outlined"
      },
      {
        title: "External Link",
        icon: 'tabler:star',
        id: uniqueId(),
        href: "https://www.google.co.in/",
      },
    ],
  },
];
export default Menuitems;
