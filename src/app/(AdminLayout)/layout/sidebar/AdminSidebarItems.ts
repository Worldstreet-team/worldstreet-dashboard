import { uniqueId } from "lodash";

export interface AdminChildItem {
  id?: number | string;
  name?: string;
  icon?: string;
  url?: string;
  badge?: boolean;
  badgeType?: string;
  badgeText?: string;
  subtitle?: string;
  disabled?: boolean;
}

export interface AdminMenuItem {
  heading?: string;
  children?: AdminChildItem[];
}

const AdminSidebarContent: AdminMenuItem[] = [
  {
    heading: "Overview",
    children: [
      {
        name: "Dashboard",
        icon: "ph:chart-pie-slice-duotone",
        id: uniqueId(),
        url: "/admin",
      },
    ],
  },
  {
    heading: "Finance",
    children: [
      {
        name: "Deposits",
        icon: "ph:download-simple-duotone",
        id: uniqueId(),
        url: "/admin/deposits",
        subtitle: "Track & manage deposits",
      },
      {
        name: "Withdrawals",
        icon: "ph:upload-simple-duotone",
        id: uniqueId(),
        url: "/admin/withdrawals",
        subtitle: "Manage payout approvals",
      },
    ],
  },
  {
    heading: "Infrastructure",
    children: [
      {
        name: "Treasury Wallets",
        icon: "ph:vault-duotone",
        id: uniqueId(),
        url: "/admin/treasury",
        subtitle: "Generate & manage wallets",
      },
    ],
  },
];

export default AdminSidebarContent;
