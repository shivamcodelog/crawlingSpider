import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import Sidebar from "../components/Sidebar";
import PricingCard from "../components/PricingCard";
import PaymentModal from "../components/PaymentModal";

export default function Billing() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data } = await client.get("/api/payments/history");
        if (data.success) setPayments(data.data || []);
      } catch (err) {
        console.error("Payments fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  // Handle Stripe success redirect
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMsg("Payment successful! Your credits have been added.");
      refreshUser();
    }
  }, [searchParams, refreshUser]);

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
  };

  const handlePaymentSuccess = (msg) => {
    setSelectedPlan(null);
    setSuccessMsg(msg || "Payment successful!");
    // Refresh payment history
    client.get("/api/payments/history").then(({ data }) => {
      if (data.success) setPayments(data.data || []);
    });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-mono text-section text-textPrimary mb-2">
            Billing
          </h1>
          <p className="font-sans text-body text-muted mb-8">
            Manage your plan and view payment history.
          </p>

          {/* Success message */}
          {successMsg && (
            <div className="flex items-center gap-3 bg-success/10 border border-success/30 rounded p-4 mb-8">
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              <p className="font-mono text-sm text-success">{successMsg}</p>
              <button
                onClick={() => setSuccessMsg("")}
                className="ml-auto text-muted hover:text-textPrimary font-mono text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Current Plan */}
          <div className="bg-surface border border-border rounded p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-caption uppercase text-muted tracking-wider">
                  Current Plan
                </span>
                <p className="font-mono text-2xl text-primary font-bold mt-1 capitalize">
                  {user?.plan || "Free"}
                </p>
              </div>
              <div>
                <span className="font-mono text-caption uppercase text-muted tracking-wider">
                  Credits
                </span>
                <p className="font-mono text-2xl text-textPrimary font-bold mt-1">
                  {user?.credits ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Plans */}
          <h2 className="font-mono text-card text-textPrimary mb-6">
            Available Plans
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {["free", "starter", "pro", "enterprise"].map((plan, i) => (
              <PricingCard
                key={plan}
                plan={plan}
                currentPlan={user?.plan}
                onUpgrade={handleUpgrade}
                index={i}
              />
            ))}
          </div>

          {/* Payment History */}
          <h2 className="font-mono text-card text-textPrimary mb-6">
            Payment History
          </h2>
          <div className="bg-surface border border-border rounded overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted font-mono text-sm">
                  No payments yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                        Date
                      </th>
                      <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                        Plan
                      </th>
                      <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                        Amount
                      </th>
                      <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                        Provider
                      </th>
                      <th className="text-left px-6 py-3 font-mono text-caption uppercase text-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr
                        key={p._id}
                        className="border-b border-border hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-muted">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-textPrimary capitalize">
                          {p.plan}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-textPrimary">
                          {p.currency === "INR" ? "₹" : "$"}
                          {p.amount}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted capitalize">
                          {p.provider}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-mono text-xs uppercase tracking-wider px-2 py-1 rounded ${
                              p.status === "success"
                                ? "bg-success/20 text-success"
                                : p.status === "failed"
                                ? "bg-error/20 text-error"
                                : "bg-muted/20 text-muted"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Modal */}
          {selectedPlan && (
            <PaymentModal
              plan={selectedPlan}
              onClose={() => setSelectedPlan(null)}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
