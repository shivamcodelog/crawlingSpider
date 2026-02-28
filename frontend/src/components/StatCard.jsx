import { motion } from "framer-motion";

export default function StatCard({ label, value, icon: Icon, color = "text-primary" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded p-6 hover:shadow-glow transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption uppercase text-muted font-mono tracking-wider">
          {label}
        </span>
        {Icon && <Icon className="w-5 h-5 text-muted" />}
      </div>
      <p className={`text-3xl font-mono font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded p-6">
      <div className="skeleton h-3 w-24 rounded mb-4" />
      <div className="skeleton h-8 w-20 rounded" />
    </div>
  );
}
