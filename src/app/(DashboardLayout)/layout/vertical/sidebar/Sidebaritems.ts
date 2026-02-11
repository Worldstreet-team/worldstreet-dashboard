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
      },
      {
        name: "Academy",
        icon: 'ph:graduation-cap-duotone',
        id: uniqueId(),
        url: "https://academy.worldstreetgold.com",
      },
      {
        name: "Social",
        icon: 'ph:chat-circle-dots-duotone',
        id: uniqueId(),
        url: "https://social.worldstreetgold.com",
      },
      {
        name: "Xstream",
        icon: 'ph:broadcast-duotone',
        id: uniqueId(),
        url: "https://xtreme.worldstreetgold.com",
      },
      {
        name: "Forex Trading",
        icon: 'ph:currency-dollar-duotone',
        id: uniqueId(),
        url: "https://portal.worldstreet.app",
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
        url: "/",
      },
      {
        name: "Futures",
        icon: 'ph:trend-up-duotone',
        id: uniqueId(),
        url: "/",
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
    heading: "Markets",
    children: [
      {
        name: "Market Overview",
        icon: 'ph:globe-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Watchlist",
        icon: 'ph:star-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Gainers & Losers",
        icon: 'ph:chart-bar-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "New Listings",
        icon: 'ph:sparkle-duotone',
        id: uniqueId(),
        url: "/",
        badge: true,
        badgeType: "outlined",
      },
    ],
  },
  {
    heading: "Wallets",
    children: [
      {
        name: "Assets",
        icon: 'ph:stack-duotone',
        id: uniqueId(),
        url: "/assets",
      },
      {
        name: "Spot Wallet",
        icon: 'ph:wallet-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Funding Wallet",
        icon: 'ph:bank-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Deposit",
        icon: 'ph:arrow-down-left-duotone',
        id: uniqueId(),
        url: "/deposit",
      },
      {
        name: "Withdraw",
        icon: 'ph:arrow-up-right-duotone',
        id: uniqueId(),
        url: "/withdraw",
      },
      {
        name: "Transactions",
        icon: 'ph:clock-counter-clockwise-duotone',
        id: uniqueId(),
        url: "/transactions",
      },
      {
        name: "Transfer",
        icon: 'ph:arrows-left-right-duotone',
        id: uniqueId(),
        url: "/",
      },
    ],
  },
  {
    heading: "Earn",
    children: [
      {
        name: "Staking",
        icon: 'ph:coins-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Savings",
        icon: 'ph:piggy-bank-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Launchpool",
        icon: 'ph:rocket-launch-duotone',
        id: uniqueId(),
        url: "/",
        badge: true,
        badgeType: "filled",
      },
    ],
  },
  {
    heading: "History",
    children: [
      {
        name: "Trade History",
        icon: 'ph:clock-counter-clockwise-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Order History",
        icon: 'ph:receipt-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Transactions",
        icon: 'ph:list-dashes-duotone',
        id: uniqueId(),
        url: "/",
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
  {
    heading: "Support",
    children: [
      {
        name: "Help Center",
        icon: 'ph:question-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Live Chat",
        icon: 'ph:chat-circle-dots-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Submit Ticket",
        icon: 'ph:ticket-duotone',
        id: uniqueId(),
        url: "/",
      },
      {
        name: "Announcements",
        icon: 'ph:megaphone-duotone',
        id: uniqueId(),
        url: "/",
      },
    ],
  },
];

export default SidebarContent;
