

//Apps Links Type & Data
interface appsLinkType {
  href: string;
  title: string;
  subtext: string;
  avatar: string;
}

const appsLink: appsLinkType[] = [
  {
    href: "#",
    title: "Spot Trading",
    subtext: "Trade crypto instantly",
    avatar: "/images/svgs/icon-dd-cart.svg",
  },
  {
    href: "#",
    title: "Futures Trading",
    subtext: "Leverage your positions",
    avatar: "/images/svgs/icon-dd-chart.svg",
  },
  {
    href: "#",
    title: "P2P Exchange",
    subtext: "Trade with peers",
    avatar: "/images/svgs/icon-dd-mobile.svg",
  },
  {
    href: "#",
    title: "Staking",
    subtext: "Earn passive rewards",
    avatar: "/images/svgs/icon-dd-invoice.svg",
  },
  {
    href: "#",
    title: "Wallet",
    subtext: "Manage your assets",
    avatar: "/images/svgs/icon-dd-lifebuoy.svg",
  },
  {
    href: "#",
    title: "Referrals",
    subtext: "Invite and earn",
    avatar: "/images/svgs/icon-dd-message-box.svg",
  },
  {
    href: "#",
    title: "Support",
    subtext: "Get help 24/7",
    avatar: "/images/svgs/icon-dd-application.svg",
  },
];

interface LinkType {
  href: string;
  title: string;
}

const pageLinks: LinkType[] = [
  {
    href: "#",
    title: "Pricing Page",
  },
  {
    href: "/auth/auth1/login",
    title: "Authentication Design",
  },
  {
    href: "/auth/auth1/register",
    title: "Register Now",
  },
  {
    href: "/404",
    title: "404 Error Page",
  },
  {
    href: "#",
    title: "Kanban App",
  },
  {
    href: "#",
    title: "User Application",
  },
  {
    href: "#",
    title: "Blog Design",
  },
  {
    href: "#",
    title: "Shopping Cart",
  },
];

//   Search Data
interface SearchType {
  href: string;
  title: string;
}

const SearchLinks: SearchType[] = [
  {
    title: "Analytics",
    href: "#",
  },
  {
    title: "eCommerce",
    href: "#",
  },
  {
    title: "CRM",
    href: "/dashboards/crm",
  },
  {
    title: "Contacts",
    href: "#",
  },
  {
    title: "Posts",
    href: "#",
  },
  {
    title: "Details",
    href: "#",
  },
];

//   Message Data
interface MessageType {
  title: string;
  avatar: any;
  subtitle: string;
}

const MessagesLink: MessageType[] = [
  {
    avatar: "/images/profile/user-2.jpg",
    title: "Roman Joined the Team!",
    subtitle: "Congratulate him",
  },
  {
    avatar: "/images/profile/user-3.jpg",
    title: "New message",
    subtitle: "Salma sent you new message",
  },
  {
    avatar: "/images/profile/user-4.jpg",
    title: "Bianca sent payment",
    subtitle: "Check your earnings",
  },
  {
    avatar: "/images/profile/user-5.jpg",
    title: "Jolly completed tasks",
    subtitle: "Assign her new tasks",
  },
  {
    avatar: "/images/profile/user-6.jpg",
    title: "John received payment",
    subtitle: "$230 deducted from account",
  },
];

//   Notification Data
interface NotificationType {
  title: string;
  icon: any;
  subtitle: string;
  bgcolor: string;
  color: string;
  time: string;
}

const Notification: NotificationType[] = [
  {
    icon: "solar:widget-3-line-duotone",
    bgcolor: "bg-lighterror dark:bg-lighterror",
    color: 'text-error',
    title: "Price Alert",
    subtitle: "BTC dropped below $42,000",
    time: "9:30 AM",
  },
  {
    icon: "solar:calendar-line-duotone",
    bgcolor: "bg-primary/20 dark:bg-primary/20",
    color: 'text-primary',
    title: "Order Filled",
    subtitle: "Your buy order for ETH was executed",
    time: "9:15 AM",
  },
  {
    icon: "solar:settings-line-duotone",
    bgcolor: "bg-lightsecondary dark:bg-lightsecondary",
    color: 'text-secondary',
    title: "Security Update",
    subtitle: "2FA has been enabled on your account",
    time: "4:36 PM",
  },
  {
    icon: "solar:widget-4-line-duotone",
    bgcolor: "bg-lightwarning dark:bg-lightwarning ",
    color: 'text-warning',
    title: "Deposit Confirmed",
    subtitle: "Your USDT deposit is now available",
    time: "9:30 AM",
  },
  {
    icon: "solar:calendar-line-duotone",
    bgcolor: "bg-primary/20 dark:bg-primary/20",
    color: 'text-primary',
    title: "Staking Reward",
    subtitle: "You earned 0.05 ETH from staking",
    time: "9:15 AM",
  },
  {
    icon: "solar:settings-line-duotone",
    bgcolor: "bg-lightsecondary dark:bg-lightsecondary",
    color: 'text-secondary',
    title: "New Listing",
    subtitle: "PEPE token is now available for trading",
    time: "4:36 PM",
  },
];

//  Profile Data
interface ProfileType {
  title: string;
  img: any;
  subtitle: string;
  url: string;
}

import taskIcon from "/public/images/svgs/icon-tasks.svg";

const profileDD: ProfileType[] = [
  {
    img: "solar:user-bold-duotone",
    title: "My Profile",
    subtitle: "Account settings",
    url: "#",
  },
  {
    img: "solar:wallet-bold-duotone",
    title: "My Wallets",
    subtitle: "Manage assets",
    url: "/assets",
  },
  {
    img: "solar:history-bold-duotone",
    title: "Trade History",
    subtitle: "View past trades",
    url: "/transactions",
  },
];

export {
  appsLink,
  pageLinks,
  SearchLinks,
  MessagesLink,
  Notification,
  profileDD,
};
