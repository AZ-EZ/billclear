import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { caseId } = await req.json();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "BillClear — custom dispute letter" },
          unit_amount: 4900,
        },
        quantity: 1,
      }],
      success_url: `${process.env.SITE_URL}/?paid=${caseId}`,
      cancel_url: `${process.env.SITE_URL}/`,
      metadata: { caseId },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return Response.json({ error: "Payment session failed" }, { status: 500 });
  }
}
