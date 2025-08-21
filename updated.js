import express from "express";
import fs from "fs";
import dotenv from "dotenv";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());

// Helpers
function loadUsers() {
  return JSON.parse(fs.readFileSync("userss.json", "utf8"));
}
function saveUsers(data) {
  fs.writeFileSync("userss.json", JSON.stringify(data, null, 2)); // fixed typo
}

/**
 * 1️⃣ Create Connected Account
 */
app.post("/create-connected-account", async (req, res) => {
  const { user_id, email } = req.body;
  try {
    const users = loadUsers();
    const user = users.find(u => String(u.id) === String(user_id)); // safer match

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create connected account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    // Save connected account ID
    user.connected_account_id = account.id;
    saveUsers(users);

    res.json({
      message: "Connected account created",
      connected_account_id: account.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2️⃣ Generate Onboarding Link
 */
app.post("/onboarding-link", async (req, res) => {
  const { user_id } = req.body;
  try {
    const users = loadUsers();
    const user = users.find(u => String(u.id) === String(user_id));

    if (!user || !user.connected_account_id) {
      return res.status(404).json({ error: "User not found or no connected account" });
    }

    const accountLink = await stripe.accountLinks.create({
      account: user.connected_account_id,
      refresh_url: "http://localhost:5000/reauth",
      return_url: "http://localhost:5000/success",
      type: "account_onboarding",
    });

    res.json({ onboarding_url: accountLink.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// ✅ Export Express app as Firebase Function
export const api = onRequest(app);
