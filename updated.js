// import express from "express";
// import fs from "fs";
// import dotenv from "dotenv";
// import Stripe from "stripe";
// import { v4 as uuidv4 } from "uuid";

// dotenv.config();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const app = express();
// app.use(express.json());

// // ------------------- Test Endpoint -------------------
// app.get("/hello", (req, res) => {
//   res.json({ message: "Hello! The server is running 🚀" });
// });

// // ------------------- Helpers -------------------
// function loadUsers() {
//   return JSON.parse(fs.readFileSync("userss.json", "utf8"));
// }
// function saveUsers(data) {
//   fs.writeFileSync("userss.json", JSON.stringify(data, null, 2));
// }

// // ------------------- 1️⃣ Create Connected Account -------------------
// app.post("/create-connected-account", async (req, res) => {
//   const { user_id, email } = req.body;
//   try {
//     const users = loadUsers();
//     const user = users.find(u => String(u.id) === String(user_id));

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     const account = await stripe.accounts.create({
//       type: "express",
//       country: "US",
//       email: email,
//       capabilities: {
//         transfers: { requested: true },
//       },
//     });

//     user.connected_account_id = account.id;
//     saveUsers(users);

//     res.json({
//       message: "Connected account created",
//       connected_account_id: account.id,
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // ------------------- 2️⃣ Generate Onboarding Link -------------------
// app.post("/onboarding-link", async (req, res) => {
//   const { user_id } = req.body;
//   try {
//     const users = loadUsers();
//     const user = users.find(u => String(u.id) === String(user_id));

//     if (!user || !user.connected_account_id) {
//       return res.status(404).json({ error: "User not found or no connected account" });
//     }

//     const accountLink = await stripe.accountLinks.create({
//       account: user.connected_account_id,
//       refresh_url: "http://localhost:5000/reauth",
//       return_url: "http://localhost:5000/success",
//       type: "account_onboarding",
//     });

//     res.json({ onboarding_url: accountLink.url });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // ------------------- Start Server -------------------
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
import express from "express";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

// Firebase
import { db } from "./config.js"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // ✅ Read from env

const app = express();
app.use(express.json());

// ------------------- Test Endpoint -------------------
app.get("/hello", (req, res) => {
  res.json({ message: "Hello! The server is running 🚀" });
});

// ------------------- 1️⃣ Create Connected Account -------------------
app.post("/create-connected-account", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const userRef = doc(db, "users", user_id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: userSnap.data().email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    await updateDoc(userRef, { connected_account_id: account.id });

    res.json({
      message: "Connected account created",
      connected_account_id: account.id,
    });
  } catch (err) {
    console.error("Error creating connected account:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- 2️⃣ Generate Onboarding Link -------------------
app.post("/onboarding-link", async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const userRef = doc(db, "users", user_id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().connected_account_id) {
      return res.status(404).json({ error: "User not found or no connected account" });
    }

    const accountLink = await stripe.accountLinks.create({
      account: userSnap.data().connected_account_id,
      refresh_url: "http://localhost:5000/reauth",  // 🔧 change when deployed
      return_url: "http://localhost:5000/success",  // 🔧 change when deployed
      type: "account_onboarding",
    });

    res.json({ onboarding_url: accountLink.url });
  } catch (err) {
    console.error("Error generating onboarding link:", err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------- Start Server -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
