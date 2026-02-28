const router = require("express").Router();
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Stripe = require("stripe");
const { verifyJWT } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Payment = require("../models/Payment");

// ── Plan pricing & credits ──
const PLANS = {
  starter: { inr: 49900, usd: 600, credits: 50 },
  pro: { inr: 149900, usd: 1800, credits: 200 },
  enterprise: { inr: 499900, usd: 6000, credits: 999999 },
};

// ════════════════════════════════════════════
//  RAZORPAY (India)
// ════════════════════════════════════════════

let razorpayInstance = null;
const getRazorpay = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// POST /api/payments/razorpay/order — Create Razorpay order
router.post("/razorpay/order", verifyJWT, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid plan selected.",
      });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: PLANS[plan].inr,
      currency: "INR",
      receipt: `msp_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        plan,
        credits: PLANS[plan].credits,
      },
    });

    // Save pending payment record
    await Payment.create({
      userId: req.user._id,
      provider: "razorpay",
      orderId: order.id,
      amount: PLANS[plan].inr / 100,
      currency: "INR",
      plan,
      creditsAdded: PLANS[plan].credits,
      status: "pending",
    });

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
      message: "Razorpay order created.",
    });
  } catch (error) {
    console.error("[PAYMENTS] Razorpay order error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to create Razorpay order.",
    });
  }
});

// POST /api/payments/razorpay/verify — Verify Razorpay payment signature
router.post("/razorpay/verify", verifyJWT, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Missing payment verification data.",
      });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      // Mark payment as failed
      await Payment.findOneAndUpdate(
        { orderId, userId: req.user._id },
        { status: "failed", paymentId, signature }
      );
      return res.status(400).json({
        success: false,
        data: null,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    // Find and update payment record
    const payment = await Payment.findOneAndUpdate(
      { orderId, userId: req.user._id },
      { status: "success", paymentId, signature },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Payment record not found.",
      });
    }

    // Add credits and upgrade plan
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { credits: payment.creditsAdded },
      $set: { plan: payment.plan },
    });

    const updatedUser = await User.findById(req.user._id);

    return res.json({
      success: true,
      data: {
        payment,
        credits: updatedUser.credits,
        plan: updatedUser.plan,
      },
      message: `Payment verified! ${payment.creditsAdded} credits added.`,
    });
  } catch (error) {
    console.error("[PAYMENTS] Razorpay verify error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Payment verification failed.",
    });
  }
});

// ════════════════════════════════════════════
//  STRIPE (International)
// ════════════════════════════════════════════

let stripeInstance = null;
const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

// POST /api/payments/stripe/checkout — Create Stripe Checkout session
router.post("/stripe/checkout", verifyJWT, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Invalid plan selected.",
      });
    }

    const stripe = getStripe();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `MapScraper Pro — ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `${PLANS[plan].credits === 999999 ? "Unlimited" : PLANS[plan].credits} credits`,
            },
            unit_amount: PLANS[plan].usd,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: req.user._id.toString(),
        plan,
        credits: PLANS[plan].credits.toString(),
      },
      success_url: `${frontendUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing?canceled=true`,
    });

    // Save pending payment record
    await Payment.create({
      userId: req.user._id,
      provider: "stripe",
      orderId: session.id,
      amount: PLANS[plan].usd / 100,
      currency: "USD",
      plan,
      creditsAdded: PLANS[plan].credits,
      status: "pending",
    });

    return res.json({
      success: true,
      data: { url: session.url, sessionId: session.id },
      message: "Stripe Checkout session created.",
    });
  } catch (error) {
    console.error("[PAYMENTS] Stripe checkout error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to create Stripe checkout session.",
    });
  }
});

// POST /api/payments/stripe/webhook — Handle Stripe webhooks
router.post(
  "/stripe/webhook",
  require("express").raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[PAYMENTS] Stripe webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, plan, credits } = session.metadata;
      const creditsToAdd = parseInt(credits);

      try {
        // Update payment record
        await Payment.findOneAndUpdate(
          { orderId: session.id },
          {
            status: "success",
            paymentId: session.payment_intent,
          }
        );

        // Add credits and update plan
        await User.findByIdAndUpdate(userId, {
          $inc: { credits: creditsToAdd },
          $set: { plan },
        });

        console.log(
          `[PAYMENTS] Stripe fulfilled: user=${userId}, plan=${plan}, credits=${creditsToAdd}`
        );
      } catch (error) {
        console.error("[PAYMENTS] Stripe webhook fulfillment error:", error);
      }
    }

    return res.json({ received: true });
  }
);

// GET /api/payments/history — Payment history for current user
router.get("/history", verifyJWT, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: payments,
      message: "Payment history retrieved.",
    });
  } catch (error) {
    console.error("[PAYMENTS] History error:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: "Failed to retrieve payment history.",
    });
  }
});

module.exports = router;
