import express from "express";
import cors from "cors";
import Stripe from "stripe";

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/create-payment-intent", async (req, res) => {
  try {
    let { amount, currency } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    currency = (currency || "pkr").toLowerCase();
    amount = Math.round(amount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/send-notification", async (req, res) => {
  try {
    const { pushToken, title, body, data } = req.body;
    if (!pushToken) return res.status(400).json({ error: "Missing pushToken" });

    const message = {
      to: pushToken,
      sound: "default",
      title: title || "New Order",
      body: body || "A new order needs your attention",
      data: data || {},
      priority: "high",
      channelId: "order-ring",
      _displayInForeground: true,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
