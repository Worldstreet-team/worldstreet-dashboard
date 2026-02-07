import { IconArrowBackUp, IconCheck, IconX } from "@tabler/icons-react";

export interface TableType {
    avatar?: any;
    name?: string;
    post?: string;
    pname?: string;
    teams: {
        id: string;
        color: string;
        text: string;
    }[];
    status?: string;
    statuscolor?: string;
    budget?: string;
}

const basicTableData: TableType[] = [
    {
        avatar: "/images/profile/user-10.jpg",
        name: "Sunil Joshi",
        post: "Senior Trader",
        pname: "BTC/USDT",
        status: "Active",
        statuscolor: "success",
        teams: [
            {
                id: "1",
                color: "error",
                text: "S",
            },
            {
                id: "2",
                color: "secondary   ",
                text: "D",
            },
        ],
        budget: "$3.9",
    },
    {
        avatar: "/images/profile/user-8.jpg",
        name: "Andrew McDownland",
        post: "Portfolio Manager",
        pname: "ETH/USDT",
        status: "Pending",
        statuscolor: "warning",
        teams: [
            {
                id: "1",
                color: "secondary",
                text: "N",
            },
            {
                id: "2",
                color: "warning   ",
                text: "X",
            },
            {
                id: "3",
                color: "primary   ",
                text: "A",
            },
        ],
        budget: "$24.5k",
    },
    {
        avatar: "/images/profile/user-3.jpg",
        name: "Christopher Jamil",
        post: "Risk Analyst",
        pname: "SOL/USDT",
        status: "Completed",
        statuscolor: "primary",
        teams: [
            {
                id: "1",
                color: "secondary",
                text: "X",
            },
        ],
        budget: "$12.8k",
    },
    {
        avatar: "/images/profile/user-7.jpg",
        name: "Nirav Joshi",
        post: "Quant Developer",
        pname: "AVAX/USDT",
        status: "Active",
        statuscolor: "success",
        teams: [
            {
                id: "1",
                color: "primary",
                text: "X",
            },
            {
                id: "2",
                color: "error",
                text: "Y",
            },
        ],
        budget: "$2.4k",
    },
    {
        avatar: "/images/profile/user-5.jpg",
        name: "Micheal Doe",
        post: "Market Analyst",
        pname: "MATIC/USDT",
        status: "Cancel",
        statuscolor: "error",
        teams: [
            {
                id: "1",
                color: "secondary",
                text: "S",
            },
        ],
        budget: "$9.3k",
    },
];


export interface TableType2 {
    avatar?: any;
    name?: string;
    post?: string;
    users: {
        id: string;
        icon: any;
    }[];
    status?: string;
    statuscolor?: string;
    budget?: string;
}

const basicTableData2: TableType2[] = [
    {
        avatar: "/images/profile/user-4.jpg",
        name: 'Olivia Rhye',
        post: 'Spot Trading',
        status: 'active',
        statuscolor: 'primary',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-8.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-10.jpg"
            }
        ]
    },
    {
        avatar: "/images/profile/user-10.jpg",
        name: 'Barbara Steele',
        post: 'Futures Trading',
        status: 'cancel',
        statuscolor: 'error',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-3.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-8.jpg"
            },
            {
                id: '3',
                icon: "/images/profile/user-10.jpg"
            }
        ]
    },
    {
        avatar: "/images/profile/user-3.jpg",
        name: 'Leonard Gordon',
        post: 'DeFi Staking',
        status: 'active',
        statuscolor: 'primary',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-8.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-3.jpg"
            }
        ]
    },
    {
        avatar: "/images/profile/user-4.jpg",
        name: 'Evelyn Pope',
        post: 'P2P Exchange',
        status: 'pending',
        statuscolor: 'success',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-3.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-8.jpg"
            },
            {
                id: '3',
                icon: "/images/profile/user-10.jpg"
            }
        ]
    },
    {
        avatar: "/images/profile/user-5.jpg",
        name: 'Tommy Garza',
        post: 'Margin Trading',
        status: 'cancel',
        statuscolor: 'error',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-6.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-5.jpg"
            }
        ]
    },
    {
        avatar: "/images/profile/user-10.jpg",
        name: 'Isabel Vasquez',
        post: 'Options Trading',
        status: 'pending',
        statuscolor: 'success',
        users: [
            {
                id: '1',
                icon: "/images/profile/user-4.jpg"
            },
            {
                id: '2',
                icon: "/images/profile/user-8.jpg"
            }
        ]
    }
];


export interface TableType3 {
    avatar?: any;
    name?: string;
    handle?: string;
    teams: {
        status: string;
        statuscolor: string;
    }[];
    status?: string;
    statusoffline?: boolean;
    statuscolor?: string;
    email?: string;
}

/*Basic Table 3*/
const basicTableData3: TableType3[] = [
    {
        avatar: "/images/profile/user-4.jpg",
        name: 'Olivia Rhye',
        handle: '@rhye',
        status: 'active',
        statuscolor: 'lightsuccess',
        statusoffline: false,
        email: 'olivia@ui.com',
        teams: [
            {
                status: 'Design',
                statuscolor: 'primary'
            },
            {
                status: 'Product',
                statuscolor: 'secondary'
            }
        ]
    },
    {
        avatar: "/images/profile/user-10.jpg",
        name: 'Barbara Steele',
        handle: '@steele',
        status: 'offline',
        statusoffline: true,
        statuscolor: 'muted',
        email: 'steele@ui.com',
        teams: [
            {
                status: 'Product',
                statuscolor: 'secondary'
            },
            {
                status: 'Operations',
                statuscolor: 'error'
            }
        ]
    },
    {
        avatar: "/images/profile/user-3.jpg",
        name: 'Leonard Gordon',
        handle: '@gordon',
        status: 'active',
        statusoffline: false,
        statuscolor: 'lightsuccess',
        email: 'olivia@ui.com',
        teams: [
            {
                status: 'Finance',
                statuscolor: 'primary'
            },
            {
                status: 'Customer Success',
                statuscolor: 'success'
            }
        ]
    },
    {
        avatar: "/images/profile/user-4.jpg",
        name: 'Evelyn Pope',
        handle: '@pope',
        status: 'offline',
        statusoffline: true,
        statuscolor: 'muted',
        email: 'steele@ui.com',
        teams: [
            {
                status: 'Operations',
                statuscolor: 'error'
            },
            {
                status: 'Design',
                statuscolor: 'primary'
            }
        ]
    },
    {
        avatar: "/images/profile/user-5.jpg",
        name: 'Tommy Garza',
        handle: '@garza',
        status: 'active',
        statusoffline: false,
        statuscolor: 'lightsuccess',
        email: 'olivia@ui.com',
        teams: [
            {
                status: 'Product',
                statuscolor: 'secondary'
            }
        ]
    },
    {
        avatar: "/images/profile/user-10.jpg",
        name: 'Isabel Vasquez',
        handle: '@vasquez',
        status: 'active',
        statusoffline: false,
        statuscolor: 'lightsuccess',
        email: 'steele@ui.com',
        teams: [
            {
                status: 'Customer Success',
                statuscolor: 'success'
            }
        ]
    }
];


export interface TableType4 {
    avatar?: any;
    name?: string;
    handle?: string;
    status?: string;
    invoice?: string;
    statuscolor?: string;
    statusicon?: any;
    progress?: any;
}

/*Basic Table 4*/
const basicTableData4: TableType4[] = [
    {
        invoice: 'INV-3066',
        status: 'paid',
        statuscolor: 'primary',
        statusicon: IconCheck,
        avatar: "/images/profile/user-10.jpg",
        name: 'Olivia Rhye',
        handle: 'olivia@ui.com',
        progress: 60
    },
    {
        invoice: 'INV-3067',
        status: 'cancelled',
        statuscolor: 'error',
        statusicon: IconX,
        avatar: "/images/profile/user-4.jpg",
        name: 'Barbara Steele',
        handle: 'steele@ui.com',
        progress: 30
    },
    {
        invoice: 'INV-3068',
        status: 'paid',
        statuscolor: 'primary',
        statusicon: IconCheck,
        avatar: "/images/profile/user-3.jpg",
        name: 'Leonard Gordon',
        handle: 'olivia@ui.com',
        progress: 45
    },
    {
        invoice: 'INV-3069',
        status: 'refunded',
        statuscolor: 'secondary',
        statusicon: IconArrowBackUp,
        avatar: "/images/profile/user-4.jpg",
        name: 'Evelyn Pope',
        handle: 'steele@ui.com',
        progress: 37
    },
    {
        invoice: 'INV-3070',
        status: 'cancelled',
        statuscolor: 'error',
        statusicon: IconX,
        avatar: "/images/profile/user-5.jpg",
        name: 'Tommy Garza',
        handle: 'olivia@ui.com',
        progress: 87
    },
    {
        invoice: 'INV-3071',
        status: 'refunded',
        statuscolor: 'secondary',
        statusicon: IconArrowBackUp,
        avatar: "/images/profile/user-10.jpg",
        name: 'Isabel Vasquez',
        handle: 'steele@ui.com',
        progress: 32
    }
];


export interface TableType5 {
    id?: string;
    avatar?: any;
    name?: string;
    handle?: string;
    courses: {
        status: string;
        statuscolor: string;
    }[];
    users?: string;
}

/*Basic Table 3*/
const basicTableData5: TableType5[] = [
    {
        avatar: "/images/blog/blog-img1.jpg",
        name: 'Top Authors',
        handle: 'Successful Fellas',
        users: '4300 Users',
        courses: [
            {
                status: 'Angular',
                statuscolor: 'error'
            },
            {
                status: 'PHP',
                statuscolor: 'primary'
            }
        ]
    },
    {
        avatar: "/images/blog/blog-img2.jpg",
        name: 'Popular Authors',
        handle: 'Most Successful',
        users: '1200 Users',
        courses: [
            {
                status: 'Bootstrap',
                statuscolor: 'primary'
            }
        ]
    },
    {
        avatar: "/images/blog/blog-img3.jpg",
        name: 'New Users',
        handle: 'Awesome Users',
        users: '2000 Users',
        courses: [
            {
                status: 'Reactjs',
                statuscolor: 'success'
            },
            {
                status: 'Angular',
                statuscolor: 'error'
            }
        ]
    },
    {
        avatar: "/images/blog/blog-img4.jpg",
        name: 'Active Customers',
        handle: 'Best Customers',
        users: '1500 Users',
        courses: [
            {
                status: 'Bootstrap',
                statuscolor: 'primary'
            }
        ]
    },
    {
        avatar: "/images/blog/blog-img5.jpg",
        name: 'NFT Marketplace',
        handle: 'Digital Assets',
        users: '9500 Users',
        courses: [
            {
                status: 'Angular',
                statuscolor: 'error'
            },
            {
                status: 'Reactjs',
                statuscolor: 'success'
            }
        ]
    }
];



export { basicTableData, basicTableData2, basicTableData3, basicTableData4, basicTableData5 };
