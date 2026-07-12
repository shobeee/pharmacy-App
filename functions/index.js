const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = onCall({ cors: true }, async (request) => {
  const { amount, currency } = request.data;
  if (!amount || amount <= 0) {
    throw new Error("Invalid amount");
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency || "pkr",
    automatic_payment_methods: { enabled: true },
  });
  return { clientSecret: paymentIntent.client_secret };
});
