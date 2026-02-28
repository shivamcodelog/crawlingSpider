import { motion } from "framer-motion";
import { Check } from "lucide-react";

const PLAN_DETAILS = {
  free: {
    name: "Free",
    priceINR: "₹0",
    priceUSD: "$0",
    credits: "5 credits",
    features: [
      "5 credits (250 records)",
      "1 concurrent job",
      "CSV + XLSX download",
    ],
  },
  starter: {
    name: "Starter",
    priceINR: "₹499",
    priceUSD: "$6",
    credits: "50 credits",
    features: [
      "50 credits (2,500 records)",
      "2 concurrent jobs",
      "CSV + XLSX download",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    priceINR: "₹1,499",
    priceUSD: "$18",
    credits: "200 credits",
    popular: true,
    features: [
      "200 credits (10,000 records)",
      "5 concurrent jobs",
      "Priority queue",
      "CSV + XLSX download",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceINR: "₹4,999",
    priceUSD: "$60",
    credits: "Unlimited",
    features: [
      "Unlimited credits",
      "Unlimited concurrent jobs",
      "API access + webhooks",
      "CSV + XLSX download",
      "Dedicated support",
    ],
  },
};

export default function PricingCard({
  plan,
  currentPlan,
  onUpgrade,
  index = 0,
}) {
  const details = PLAN_DETAILS[plan];
  if (!details) return null;

  const isCurrentPlan = currentPlan === plan;
  const isPopular = details.popular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded p-6 border transition-all duration-300 ${
        isPopular
          ? "bg-surface border-primary shadow-glow-lg scale-105"
          : "bg-surface border-border hover:border-primary/50 hover:shadow-glow"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-bg font-mono text-xs uppercase tracking-wider px-3 py-1 rounded">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="font-mono text-card text-textPrimary mb-2">
        {details.name}
      </h3>

      <div className="mb-4">
        <span className="text-3xl font-mono font-bold text-primary">
          {details.priceINR}
        </span>
        <span className="text-muted font-mono text-sm ml-2">
          / {details.priceUSD}
        </span>
      </div>

      <p className="text-muted font-mono text-sm mb-6">{details.credits}</p>

      <ul className="space-y-3 mb-6">
        {details.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-textPrimary font-sans">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {onUpgrade && plan !== "free" && (
        <button
          onClick={() => onUpgrade(plan)}
          disabled={isCurrentPlan}
          className={`w-full py-3 rounded font-mono text-sm uppercase tracking-wider transition-all duration-200 ${
            isCurrentPlan
              ? "bg-border text-muted cursor-not-allowed"
              : isPopular
              ? "bg-primary text-bg hover:bg-primary/90"
              : "border border-primary text-primary hover:bg-primary hover:text-bg"
          }`}
        >
          {isCurrentPlan ? "Current Plan" : "Upgrade"}
        </button>
      )}
    </motion.div>
  );
}
