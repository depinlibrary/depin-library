export type DePINProject = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: Category;
  blockchain: string;
  token: string;
  website: string;
  status: "live" | "testnet" | "development";
  yearFounded: number;
  logo: string; // emoji for now, will be replaced with images
};

export type Category =
  | "Wireless"
  | "Storage"
  | "Compute"
  | "Sensors"
  | "Energy"
  | "Mapping"
  | "AI"
  | "Mobility"
  | "CDN"
  | "VPN";

export const CATEGORIES: { name: Category; emoji: string; count?: number }[] = [
  { name: "Wireless", emoji: "📡" },
  { name: "Storage", emoji: "💾" },
  { name: "Compute", emoji: "⚡" },
  { name: "Sensors", emoji: "🌡️" },
  { name: "Energy", emoji: "🔋" },
  { name: "Mapping", emoji: "🗺️" },
  { name: "AI", emoji: "🤖" },
  { name: "Mobility", emoji: "🚗" },
  { name: "CDN", emoji: "🌐" },
  { name: "VPN", emoji: "🔒" },
];

export const BLOCKCHAINS = [
  "Solana",
  "Ethereum",
  "Polygon",
  "Cosmos",
  "IoTeX",
  "Polkadot",
  "Arbitrum",
  "Filecoin",
  "Arweave",
  "Custom",
];

export const projects: DePINProject[] = [
  {
    id: "1",
    name: "Helium",
    slug: "helium",
    tagline: "The People's Network",
    description:
      "Helium is a decentralized wireless infrastructure network that enables IoT devices to communicate. Users deploy hotspots to provide LoRaWAN and 5G coverage, earning HNT tokens for network participation. With over 900,000 hotspots deployed globally, Helium is one of the largest DePIN networks in the world.",
    category: "Wireless",
    blockchain: "Solana",
    token: "HNT",
    website: "https://www.helium.com",
    status: "live",
    yearFounded: 2013,
    logo: "📡",
  },
  {
    id: "2",
    name: "Filecoin",
    slug: "filecoin",
    tagline: "Decentralized storage for humanity's data",
    description:
      "Filecoin is a decentralized storage network designed to store humanity's most important information. Storage providers earn FIL tokens by providing reliable storage to clients. The network has petabytes of storage capacity distributed across thousands of providers worldwide.",
    category: "Storage",
    blockchain: "Filecoin",
    token: "FIL",
    website: "https://filecoin.io",
    status: "live",
    yearFounded: 2017,
    logo: "💾",
  },
  {
    id: "3",
    name: "Render Network",
    slug: "render-network",
    tagline: "Distributed GPU rendering at scale",
    description:
      "Render Network connects GPU owners with creators who need rendering power. Artists, designers, and developers can access distributed GPU computing for 3D rendering, AI, and machine learning workloads at a fraction of traditional cloud costs.",
    category: "Compute",
    blockchain: "Solana",
    token: "RNDR",
    website: "https://rendernetwork.com",
    status: "live",
    yearFounded: 2017,
    logo: "🎨",
  },
  {
    id: "4",
    name: "Hivemapper",
    slug: "hivemapper",
    tagline: "Mapping the world with dashcams",
    description:
      "Hivemapper is building a decentralized map of the world using dashcam-equipped vehicles. Drivers earn HONEY tokens by contributing street-level imagery that is processed into a global, up-to-date map competing with Google Street View.",
    category: "Mapping",
    blockchain: "Solana",
    token: "HONEY",
    website: "https://hivemapper.com",
    status: "live",
    yearFounded: 2015,
    logo: "🗺️",
  },
  {
    id: "5",
    name: "Akash Network",
    slug: "akash-network",
    tagline: "The open cloud compute marketplace",
    description:
      "Akash Network is a decentralized cloud computing marketplace that connects those who need computing resources with providers who have spare capacity. It offers up to 85% cost savings compared to traditional cloud providers like AWS and Google Cloud.",
    category: "Compute",
    blockchain: "Cosmos",
    token: "AKT",
    website: "https://akash.network",
    status: "live",
    yearFounded: 2015,
    logo: "☁️",
  },
  {
    id: "6",
    name: "DIMO",
    slug: "dimo",
    tagline: "Own your vehicle data",
    description:
      "DIMO is a decentralized network that allows vehicle owners to collect, share, and monetize their car data. By connecting a DIMO device or app, drivers earn tokens while contributing to a shared mobility data ecosystem.",
    category: "Mobility",
    blockchain: "Polygon",
    token: "DIMO",
    website: "https://dimo.zone",
    status: "live",
    yearFounded: 2021,
    logo: "🚗",
  },
  {
    id: "7",
    name: "WeatherXM",
    slug: "weatherxm",
    tagline: "Community-powered weather data",
    description:
      "WeatherXM rewards weather station owners for sharing hyperlocal weather data. The network aims to build the world's largest and most accurate weather data network through community-owned stations deployed across the globe.",
    category: "Sensors",
    blockchain: "Ethereum",
    token: "WXM",
    website: "https://weatherxm.com",
    status: "live",
    yearFounded: 2020,
    logo: "🌦️",
  },
  {
    id: "8",
    name: "Theta Network",
    slug: "theta-network",
    tagline: "Decentralized video delivery network",
    description:
      "Theta Network is a decentralized content delivery network for video streaming. Users share their bandwidth and computing resources to relay video content, reducing costs for streaming platforms while earning THETA tokens.",
    category: "CDN",
    blockchain: "Custom",
    token: "THETA",
    website: "https://www.thetatoken.org",
    status: "live",
    yearFounded: 2017,
    logo: "🎬",
  },
  {
    id: "9",
    name: "IoTeX",
    slug: "iotex",
    tagline: "The modular infrastructure for DePIN",
    description:
      "IoTeX is a blockchain platform purpose-built for connecting IoT devices and DePIN applications. It provides modular infrastructure for projects to build verifiable machine data economies with real-world device connectivity.",
    category: "Sensors",
    blockchain: "IoTeX",
    token: "IOTX",
    website: "https://iotex.io",
    status: "live",
    yearFounded: 2017,
    logo: "🔗",
  },
  {
    id: "10",
    name: "Deeper Network",
    slug: "deeper-network",
    tagline: "Decentralized VPN and web security",
    description:
      "Deeper Network combines blockchain with network security hardware. Users run Deeper devices to share bandwidth, creating a decentralized VPN network while earning DPR tokens and gaining enhanced cybersecurity protection.",
    category: "VPN",
    blockchain: "Polkadot",
    token: "DPR",
    website: "https://www.deeper.network",
    status: "live",
    yearFounded: 2018,
    logo: "🛡️",
  },
  {
    id: "11",
    name: "Arweave",
    slug: "arweave",
    tagline: "Permanent data storage",
    description:
      "Arweave is a decentralized storage protocol that offers permanent data storage with a one-time fee. Unlike traditional storage solutions, data stored on Arweave is designed to persist forever, making it ideal for archival and censorship-resistant applications.",
    category: "Storage",
    blockchain: "Arweave",
    token: "AR",
    website: "https://www.arweave.org",
    status: "live",
    yearFounded: 2017,
    logo: "♾️",
  },
  {
    id: "12",
    name: "Storj",
    slug: "storj",
    tagline: "Enterprise-grade decentralized cloud storage",
    description:
      "Storj is a decentralized cloud storage platform that splits, encrypts, and distributes files across a global network of nodes. It offers S3-compatible storage that is more secure, performant, and cost-effective than traditional cloud storage.",
    category: "Storage",
    blockchain: "Ethereum",
    token: "STORJ",
    website: "https://www.storj.io",
    status: "live",
    yearFounded: 2014,
    logo: "🗄️",
  },
  {
    id: "13",
    name: "Flux",
    slug: "flux",
    tagline: "Decentralized cloud infrastructure",
    description:
      "Flux provides decentralized computational infrastructure with a full suite of cloud services including web hosting, app deployment, and computational workloads. Node operators earn FLUX tokens by providing computational resources to the network.",
    category: "Compute",
    blockchain: "Custom",
    token: "FLUX",
    website: "https://runonflux.io",
    status: "live",
    yearFounded: 2018,
    logo: "⚡",
  },
  {
    id: "14",
    name: "World Mobile",
    slug: "world-mobile",
    tagline: "Connecting the unconnected",
    description:
      "World Mobile is building a decentralized mobile network to bring connectivity to the 4 billion people still without reliable internet. Using a hybrid approach with local operators earning tokens, it started deployments in Africa.",
    category: "Wireless",
    blockchain: "Custom",
    token: "WMT",
    website: "https://worldmobile.io",
    status: "live",
    yearFounded: 2018,
    logo: "📱",
  },
  {
    id: "15",
    name: "Grass",
    slug: "grass",
    tagline: "Sell your unused bandwidth for AI",
    description:
      "Grass allows users to sell their unused internet bandwidth to AI companies that need it for web scraping and data collection. By running a browser extension, participants earn GRASS tokens while contributing to AI training data pipelines.",
    category: "AI",
    blockchain: "Solana",
    token: "GRASS",
    website: "https://www.getgrass.io",
    status: "live",
    yearFounded: 2023,
    logo: "🌿",
  },
  {
    id: "16",
    name: "io.net",
    slug: "ionet",
    tagline: "Decentralized GPU cloud for AI/ML",
    description:
      "io.net aggregates GPU computing power from underutilized sources including data centers, crypto miners, and individual devices. It creates a decentralized GPU cloud specifically optimized for AI and machine learning workloads.",
    category: "AI",
    blockchain: "Solana",
    token: "IO",
    website: "https://io.net",
    status: "live",
    yearFounded: 2022,
    logo: "🧠",
  },
  {
    id: "17",
    name: "Peaq",
    slug: "peaq",
    tagline: "Layer 1 for DePIN and machine economy",
    description:
      "Peaq is a Layer 1 blockchain built specifically for DePIN and the Economy of Things. It provides modular building blocks like machine IDs, machine payments, and data verification that other DePIN projects can use to build on top of.",
    category: "Compute",
    blockchain: "Polkadot",
    token: "PEAQ",
    website: "https://www.peaq.network",
    status: "live",
    yearFounded: 2020,
    logo: "⛓️",
  },
  {
    id: "18",
    name: "Natix Network",
    slug: "natix-network",
    tagline: "AI-powered camera mapping network",
    description:
      "Natix Network uses smartphone cameras and AI to create dynamic, real-time maps. Users contribute visual data through a drive-to-earn model, creating continuously updated geospatial intelligence for autonomous vehicles and smart cities.",
    category: "Mapping",
    blockchain: "Solana",
    token: "NATIX",
    website: "https://www.natix.network",
    status: "live",
    yearFounded: 2021,
    logo: "📸",
  },
  {
    id: "19",
    name: "Nosana",
    slug: "nosana",
    tagline: "Decentralized GPU grid for AI inference",
    description:
      "Nosana provides a decentralized GPU computing grid focused on AI inference workloads. GPU owners can monetize their hardware by running AI models, while developers access affordable GPU compute for deploying AI applications.",
    category: "AI",
    blockchain: "Solana",
    token: "NOS",
    website: "https://nosana.io",
    status: "live",
    yearFounded: 2021,
    logo: "🔮",
  },
  {
    id: "20",
    name: "React",
    slug: "react-network",
    tagline: "Decentralized energy grid protocol",
    description:
      "React is building a decentralized energy marketplace where prosumers can trade renewable energy peer-to-peer. By connecting solar panels, batteries, and smart meters to the network, participants earn tokens while contributing to a cleaner grid.",
    category: "Energy",
    blockchain: "Ethereum",
    token: "REACT",
    website: "https://www.reactnetwork.io",
    status: "testnet",
    yearFounded: 2022,
    logo: "☀️",
  },
];

export function getProjectBySlug(slug: string): DePINProject | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectsByCategory(category: Category): DePINProject[] {
  return projects.filter((p) => p.category === category);
}

export function searchProjects(query: string): DePINProject[] {
  const q = query.toLowerCase();
  return projects.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.blockchain.toLowerCase().includes(q) ||
      p.token.toLowerCase().includes(q)
  );
}
