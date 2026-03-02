import { motion } from "framer-motion";
import { BookOpen, Cpu, Globe, Layers, Lightbulb, Rocket, Shield, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  {
    icon: Lightbulb,
    title: "What is DePIN?",
    content:
      "DePIN stands for Decentralized Physical Infrastructure Networks. It's a new model where everyday people contribute physical resources — like wireless hotspots, sensors, storage drives, or compute power — and earn crypto rewards in return. Instead of large corporations building and owning infrastructure, DePIN lets communities build it together.",
  },
  {
    icon: Layers,
    title: "How Does DePIN Work?",
    content:
      "DePIN projects use blockchain technology to coordinate and incentivize contributors. When you provide a resource (bandwidth, storage, sensor data, etc.), smart contracts verify your contribution and distribute token rewards automatically. The more you contribute, the more you earn — creating a flywheel effect where the network grows organically.",
  },
  {
    icon: Cpu,
    title: "Types of DePIN Projects",
    items: [
      { label: "Wireless", desc: "Decentralized WiFi, 5G, and IoT connectivity networks" },
      { label: "Storage", desc: "Distributed file storage and data availability layers" },
      { label: "Compute", desc: "Shared GPU/CPU resources for AI, rendering, and processing" },
      { label: "Sensors", desc: "Environmental monitoring, weather, and geospatial data collection" },
      { label: "Energy", desc: "Peer-to-peer energy trading and grid management" },
      { label: "Mapping", desc: "Decentralized street-level and geospatial mapping" },
    ],
  },
  {
    icon: Rocket,
    title: "Getting Started",
    steps: [
      {
        title: "1. Explore Projects",
        desc: "Browse the DePIN Library to discover projects by category, blockchain, and rating. Read reviews from the community.",
      },
      {
        title: "2. Choose Your Niche",
        desc: "Pick a category that matches your interests and resources. Do you have spare hard drive space? Look at storage projects. Have a good internet connection? Check wireless networks.",
      },
      {
        title: "3. Get the Hardware",
        desc: "Some projects require specific hardware (like a Helium hotspot), while others work with any computer or phone. Check project documentation for requirements.",
      },
      {
        title: "4. Set Up a Wallet",
        desc: "You'll need a crypto wallet compatible with the project's blockchain (Solana, Ethereum, etc.) to receive rewards.",
      },
      {
        title: "5. Start Contributing",
        desc: "Deploy your node, sensor, or device. Follow the project's setup guide and start earning rewards for your contributions.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Staying Safe",
    content:
      "Always do your own research (DYOR) before investing time or money. Check if the project has an active community, transparent team, and working product. Read reviews here on DePIN Library. Be cautious of projects promising unrealistic returns — if it sounds too good to be true, it probably is.",
  },
  {
    icon: Globe,
    title: "The DePIN Ecosystem",
    content:
      "DePIN is one of the fastest-growing sectors in crypto. Projects span multiple blockchains including Solana, Ethereum, Polygon, and IoTeX. The total market continues to expand as more real-world infrastructure moves on-chain. By participating early, you're helping build the decentralized future of infrastructure.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const Learn = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="gradient-radial-top absolute inset-0" />
        <div className="bg-grid absolute inset-0 opacity-30" />
        <div className="container relative mx-auto px-4 text-center">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 glow-primary-sm">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Learn <span className="text-primary text-glow">DePIN</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              New to Decentralized Physical Infrastructure Networks? This guide will take you
              from zero to deploying your first node.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 pb-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              {...fadeUp}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
              viewport={{ once: true }}
              whileInView="animate"
              initial="initial"
              className="rounded-2xl border border-border bg-card p-6 sm:p-8"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              </div>

              {section.content && (
                <p className="leading-relaxed text-muted-foreground">{section.content}</p>
              )}

              {section.items && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-secondary/50 p-4"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.steps && (
                <div className="space-y-4">
                  {section.steps.map((step) => (
                    <div key={step.title} className="border-l-2 border-primary/30 pl-4">
                      <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Learn;
