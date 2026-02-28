import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Layers,
  FilterX,
  FileSpreadsheet,
  UserCircle,
  Search,
  Hash,
  Download,
  MapPin,
} from "lucide-react";
import TerminalWindow from "../components/TerminalWindow";
import PricingCard from "../components/PricingCard";

const features = [
  {
    icon: Layers,
    title: "Two-Stage Scraping",
    desc: "Collects all listing HREFs first, then navigates each URL individually for maximum reliability.",
  },
  {
    icon: FilterX,
    title: "Deduplication Built-In",
    desc: "Automatic name + phone dedup ensures zero duplicate entries across multiple queries.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export to Excel",
    desc: "Auto-formatted .xlsx files with proper column widths, ready for CRM import.",
  },
];

const steps = [
  { icon: UserCircle, label: "Sign in with Google" },
  { icon: Search, label: 'Enter your search query (e.g. "Textile Industry in Surat")' },
  { icon: Hash, label: "Choose how many records" },
  { icon: Download, label: "Download your Excel file" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <span className="font-mono text-lg font-bold">
              MapScraper<span className="text-primary">Pro</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="font-mono text-sm text-muted hover:text-textPrimary transition-colors">
              Pricing
            </a>
            <Link
              to="/login"
              className="font-mono text-sm px-5 py-2 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden scanline-overlay">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-mono text-hero leading-tight mb-6">
              Scrape Google Maps.
              <br />
              <span className="text-primary">At Scale.</span>
              <span className="animate-blink text-primary">_</span>
            </h1>
            <p className="font-sans text-body text-muted max-w-lg mb-8">
              Extract businesses, contacts &amp; coordinates from any Google Maps
              search — powered by Playwright, saved as Excel. Production-grade
              scraping with deduplication and retry logic.
            </p>
            <div className="flex gap-4">
              <Link
                to="/login"
                className="font-mono text-sm px-8 py-3 bg-primary text-bg rounded hover:bg-primary/90 transition-all hover:shadow-glow"
              >
                Get Started Free
              </Link>
              <a
                href="#pricing"
                className="font-mono text-sm px-8 py-3 border border-primary text-primary rounded hover:bg-primary/10 transition-all"
              >
                View Pricing
              </a>
            </div>
          </motion.div>

          {/* Right — animated terminal */}
          <TerminalWindow />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-section text-center mb-16"
          >
            Why MapScraper<span className="text-primary">Pro</span>?
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-surface border border-border rounded p-6 border-t-2 border-t-primary hover:shadow-glow transition-shadow duration-300"
              >
                <f.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-mono text-card text-textPrimary mb-3">
                  {f.title}
                </h3>
                <p className="font-sans text-body text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-section text-center mb-16"
          >
            How It <span className="text-primary">Works</span>
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <span className="font-mono text-primary font-bold text-lg">
                    {i + 1}
                  </span>
                </div>
                <s.icon className="w-6 h-6 text-primary mx-auto mb-3" />
                <p className="font-mono text-sm text-textPrimary">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-mono text-section text-center mb-4"
          >
            Simple <span className="text-primary">Pricing</span>
          </motion.h2>
          <p className="text-center text-muted font-sans text-body mb-16">
            Start free, scale as you grow.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {["free", "starter", "pro", "enterprise"].map((plan, i) => (
              <PricingCard key={plan} plan={plan} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm font-bold">
              MapScraper<span className="text-primary">Pro</span>
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="font-mono text-xs text-muted hover:text-textPrimary transition-colors">
              Privacy
            </a>
            <a href="#" className="font-mono text-xs text-muted hover:text-textPrimary transition-colors">
              Terms
            </a>
            <a href="#" className="font-mono text-xs text-muted hover:text-textPrimary transition-colors">
              Contact
            </a>
          </div>
          <p className="font-sans text-xs text-muted">
            Built with ♥ for lead generation
          </p>
        </div>
      </footer>
    </div>
  );
}
