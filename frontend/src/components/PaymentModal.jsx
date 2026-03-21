import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

export default function PaymentModal({ plan, onClose, onSuccess }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentType, setPaymentType] = useState("razorpay"); // razorpay | stripe

  const handleRazorpay = async () => {
    setLoading(true);
    try {
      const { data } = await client.post("/api/payments/razorpay/order", { plan });
      if (!data.success) throw new Error(data.message);

      const options = {
        key: RAZORPAY_KEY,
        amount: data.data.amount,
        currency: data.data.currency,
        name: "Shizuku8",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        order_id: data.data.orderId,
        handler: async (response) => {
          try {
            const verifyRes = await client.post("/api/payments/razorpay/verify", {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              await refreshUser();
              onSuccess?.(verifyRes.data.message);
            }
          } catch (err) {
            console.error("Verification failed:", err);
          }
        },
        prefill: {
          email: user?.email || "",
          name: user?.name || "",
        },
        theme: {
          color: "#FF6B00",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStripe = async () => {
    setLoading(true);
    try {
      const { data } = await client.post("/api/payments/stripe/checkout", { plan });
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch (err) {
      console.error("Stripe error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (paymentType === "razorpay") {
      handleRazorpay();
    } else {
      handleStripe();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded p-8 max-w-md w-full">
        <h2 className="font-mono text-section text-textPrimary mb-2">
          Upgrade to {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </h2>
        <p className="text-muted font-sans text-body mb-6">
          Choose your preferred payment method.
        </p>

        {/* Payment method selector */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setPaymentType("razorpay")}
            className={`flex-1 py-3 rounded font-mono text-sm border transition-all ${
              paymentType === "razorpay"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:border-primary/50"
            }`}
          >
            🇮🇳 Razorpay (INR)
          </button>
          <button
            onClick={() => setPaymentType("stripe")}
            className={`flex-1 py-3 rounded font-mono text-sm border transition-all ${
              paymentType === "stripe"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:border-primary/50"
            }`}
          >
            🌍 Stripe (USD)
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded font-mono text-sm border border-border text-muted hover:text-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 py-3 rounded font-mono text-sm bg-primary text-bg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
