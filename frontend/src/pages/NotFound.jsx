import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-mono text-hero text-primary mb-4">ERROR_404</h1>
        <p className="font-mono text-body text-muted mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="font-mono text-sm px-8 py-3 bg-primary text-bg rounded hover:bg-primary/90 transition-colors"
        >
          Go Home
        </Link>
      </motion.div>
    </div>
  );
}
