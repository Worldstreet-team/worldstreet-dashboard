export interface ChildItem {
  // path: string;
  id?: number | string;
  name?: string;
  icon?: any;
  children?: ChildItem[];
  item?: any;
  url?: any;
  color?: string;
  disabled?: boolean,
  subtitle?: string,
  badge?: boolean,
  badgeType?: string,
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: any;
  id?: number;
  to?: string;
  items?: MenuItem[];
  children?: ChildItem[];
  url?: any;
  disabled?: boolean,
  subtitle?: string,
  badgeType?: string,
  badge?: boolean,
}


import { uniqueId } from "lodash";

const SidebarContent: MenuItem[] = [
  {
    heading: "Overview",
    children: [
      {
        name: "Dashboard",
        icon: 'ph:chart-pie-slice-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Assets",
        icon: 'ph:coins-duotone',
        id: uniqueId(),
        url: "/assets",
      },
      {
        name: "Swap",
        icon: 'ph:swap-duotone',
        id: uniqueId(),
        url: "/swap",
      },
      {
        name: "Deposits",
        icon: 'ph:download-simple-duotone',
        id: uniqueId(),
        url: "/deposit",
      },
      {
        name: "Withdrawal",
        icon: 'ph:upload-simple-duotone',
        id: uniqueId(),
        url: "/withdraw",
      },
      {
        name: "Transfer",
        icon: 'ph:arrow-square-out-duotone',
        id: uniqueId(),
        url: "/transfer",
      },
      {
        name: "Transactions",
        icon: 'ph:clock-counter-clockwise-duotone',
        id: uniqueId(),
        url: "/transactions",
      },
    ],
  },
  {
    heading: "WorldStreet",
    children: [
      {
        name: "Store",
        icon: 'ph:storefront-duotone',
        id: uniqueId(),
        url: "https://shop.worldstreetgold.com",
        subtitle: "Shop exclusive merch & gear",
      },
      {
        name: "Academy",
        icon: 'ph:graduation-cap-duotone',
        id: uniqueId(),
        url: "https://academy.worldstreetgold.com",
        subtitle: "Learn trading from experts",
      },
      {
        name: "Social",
        icon: 'ph:chat-circle-dots-duotone',
        id: uniqueId(),
        url: "https://social.worldstreetgold.com",
        subtitle: "Connect with the community",
      },
      {
        name: "Xstream",
        icon: 'ph:broadcast-duotone',
        id: uniqueId(),
        url: "https://xtreme.worldstreetgold.com",
        subtitle: "Live streams & broadcasts",
      },
      {
        name: "Forex Trading",
        icon: 'ph:currency-dollar-duotone',
        id: uniqueId(),
        url: "https://portal.worldstreet.app",
        subtitle: "Trade global currency pairs",
      },
      {
        name: "Vivid AI",
        icon: 'ph:sparkle-duotone',
        id: uniqueId(),
        url: "/vivid",
        subtitle: "AI-powered trading insights",
      },
    ],
  },
  {
    heading: "Trading",
    children: [
      {
        name: "Spot Trading",
        icon: 'ph:chart-line-up-duotone',
        id: uniqueId(),
        url: "/spot",
      },
      {
        name: "Futures",
        icon: 'ph:trend-up-duotone',
        id: uniqueId(),
        url: "/futures",
        badge: true,
        badgeType: "filled",
      },
      {
        name: "Swap",
        icon: 'ph:swap-duotone',
        id: uniqueId(),
        url: "/swap",
        badge: true,
        badgeType: "outlined",
      },
    ],
  },

  {
    heading: "Account",
    children: [
      {
        name: "Profile",
        icon: 'ph:user-circle-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Security",
        icon: 'ph:shield-check-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Verification",
        icon: 'ph:identification-card-duotone',
        id: uniqueId(),
        url: "/",
        subtitle: "KYC Status",
      },
      {
        name: "API Management",
        icon: 'ph:code-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Referrals",
        icon: 'ph:users-three-duotone',
        id: uniqueId(),
        url: "/",
      },
    ],
  },

];

export default SidebarContent;
