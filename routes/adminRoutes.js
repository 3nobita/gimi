const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
// const logger = require('../utils/logger');

// Middleware to check if admin is logged in
const isAdminLoggedIn = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }
  res.redirect("/admin/login");
};

// 1. Seed Initial Super Admin (Helper route to create first admin easily)
router.get("/seed-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.execute({
      sql: `INSERT OR IGNORE INTO platform_admin (admin_name, email, password, role) VALUES (?, ?, ?, ?)`,
      args: ["Super Admin", "admin@gmail.com", hashedPassword, "SUPER_ADMIN"],
    });
    res.send("Super Admin created successfully! Email: admin@gmail.com, Password: admin123");
  } catch (err) {
    res.status(500).send("Error seeding admin: " + err.message);
  }
});

// 2. Admin Login Get
router.get("/login", (req, res) => {
  res.render("admin/login", { error: null });
});

// 3. Admin Login Post
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.execute({
      sql: `SELECT * FROM platform_admin WHERE email = ?`,
      args: [email],
    });

    if (result.rows.length === 0) {
      return res.render("admin/login", { error: "Invalid email or password" });
    }

    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.render("admin/login", { error: "Invalid email or password" });
    }

    req.session.adminId = admin.admin_id;
    req.session.adminName = admin.admin_name;
    req.session.role = admin.role;

    res.redirect("/admin/dashboard");
  } catch (err) {
    res.render("admin/login", { error: "Something went wrong: " + err.message });
  }
});

// 4. Admin Dashboard (Analytics Queries)
router.get("/dashboard", isAdminLoggedIn, async (req, res) => {
  try {
    // Total Registered Shops
    const totalShopsRes = await db.execute(`SELECT COUNT(*) as count FROM shop_list`);
    const totalShops = totalShopsRes.rows[0].count;

    // Active Shops
    const activeShopsRes = await db.execute(`SELECT COUNT(*) as count FROM shop_list WHERE shop_status = 'ACTIVE'`);
    const activeShops = activeShopsRes.rows[0].count;

    // Expired Subscriptions
    const expiredSubsRes = await db.execute(`SELECT COUNT(*) as count FROM shop_subscriptions WHERE subscription_status = 'EXPIRED'`);
    const expiredSubs = expiredSubsRes.rows[0].count;

    // Pending Payments
    const pendingPaymentsRes = await db.execute(`SELECT COUNT(*) as count FROM subscription_payments WHERE payment_status = 'PENDING'`);
    const pendingPayments = pendingPaymentsRes.rows[0].count;

    // Total Revenue
    const revenueRes = await db.execute(`SELECT SUM(amount) as total FROM subscription_payments WHERE payment_status = 'SUCCESS'`);
    const totalRevenue = revenueRes.rows[0].total || 0;

    res.render("admin/dashboard", {
      adminName: req.session.adminName,
      stats: {
        totalShops,
        activeShops,
        expiredSubs,
        pendingPayments,
        totalRevenue,
      },
    });
  } catch (err) {
    res.status(500).send("Dashboard error: " + err.message);
  }
});

// 5. Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

router.get("/shops", isAdminLoggedIn, async (req, res) => {
  try {
    const shopsRes = await db.execute(`
      SELECT s.*, u.login_id 
      FROM shop_list s
      LEFT JOIN users_shop u ON s.shop_id = u.shop_id
      ORDER BY s.shop_id DESC
    `);

    res.render("admin/shops", {
      adminName: req.session.adminName,
      shops: shopsRes.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching shops: " + err.message);
  }
});

// 2. Render Register Shop Form
router.get("/shops/new", isAdminLoggedIn, (req, res) => {
  res.render("admin/shop_new", {
    adminName: req.session.adminName,
    error: null,
  });
});

// 3. Handle Shop Registration & Auto Owner Login Creation
router.post("/shops/new", isAdminLoggedIn, async (req, res) => {
  const {
    shop_name,
    shop_no,
    area,
    shop_address,
    google_link,
    contact_person,
    contact_number,
    email,
    login_id,
    password,
  } = req.body;

  try {
    // Hash owner password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into shop_list
const shopResult = await db.execute({
  sql: `INSERT INTO shop_list
  (shop_name, shop_no, area, shop_address, google_link,
   contact_person, contact_number, email)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

  args: [
    shop_name ?? null,
    shop_no || null,
    area ?? null,
    shop_address ?? null,
    google_link || null,
    contact_person ?? null,
    contact_number ?? null,
    email ?? null,
  ],
});

console.log("INSERT RESULT:", shopResult);

const shopId = Number(shopResult.lastInsertRowid);

console.log("NEW SHOP ID:", shopId);
    // Get the newly created shop_id (Turso / SQLite lastInsertRowid)
await db.execute({
  sql: `INSERT INTO users_shop (shop_id, login_id, password)
        VALUES (?, ?, ?)`,
  args: [
    shopId,
    String(login_id),
    String(hashedPassword),
  ],
});

    res.redirect("/admin/shops?success=Shop registered and owner login created successfully!");
} catch (err) {
  console.error("SHOP REGISTRATION ERROR:", err);

  res.status(500).render("admin/shop_new", {
    adminName: req.session.adminName,
    error: err.message
  });
}
});

// 4. Toggle Shop Status (ACTIVE / INACTIVE / CLOSED)
router.post("/shops/:id/status", isAdminLoggedIn, async (req, res) => {
  const shopId = req.params.id;
  const { shop_status } = req.body;

  try {
    await db.execute({
      sql: `UPDATE shop_list SET shop_status = ?, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ?`,
      args: [shop_status, shopId],
    });
    res.redirect("/admin/shops?success=Shop status updated successfully!");
  } catch (err) {
    res.redirect("/admin/shops?error=Failed to update status: " + err.message);
  }
});

// --- SUBSCRIPTION & PLAN MANAGEMENT ROUTES ---

// 1. View Subscription Plans & Shop Subscriptions
router.get("/subscriptions", isAdminLoggedIn, async (req, res) => {
  try {
    // Fetch all plans
    const plansRes = await db.execute(`SELECT * FROM subscription_plans ORDER BY plan_id DESC`);

    // Fetch active/all shop subscriptions with shop names and plan names
    const subsRes = await db.execute(`
      SELECT sub.*, s.shop_name, p.plan_name 
      FROM shop_subscriptions sub
      JOIN shop_list s ON sub.shop_id = s.shop_id
      JOIN subscription_plans p ON sub.plan_id = p.plan_id
      ORDER BY sub.subscription_id DESC
    `);

    res.render("admin/subscriptions", {
      adminName: req.session.adminName,
      plans: plansRes.rows,
      subscriptions: subsRes.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching subscriptions: " + err.message);
  }
});

// 2. Create Subscription Plan
router.post("/subscriptions/plans/new", isAdminLoggedIn, async (req, res) => {
  const { plan_name, plan_price, duration_days } = req.body;
  try {
    await db.execute({
      sql: `INSERT INTO subscription_plans (plan_name, plan_price, duration_days) VALUES (?, ?, ?)`,
      args: [plan_name, plan_price, duration_days],
    });
    res.redirect("/admin/subscriptions?success=Subscription plan created successfully!");
  } catch (err) {
    res.redirect("/admin/subscriptions?error=Failed to create plan: " + err.message);
  }
});

// 3. Assign Plan to Shop (Manual / Direct Activation)
router.get("/subscriptions/assign", isAdminLoggedIn, async (req, res) => {
  try {
    const shopsRes = await db.execute(`SELECT shop_id, shop_name, area FROM shop_list WHERE shop_status = 'ACTIVE'`);
    const plansRes = await db.execute(`SELECT * FROM subscription_plans WHERE plan_status = 'ACTIVE'`);

    res.render("admin/assign_subscription", {
      adminName: req.session.adminName,
      shops: shopsRes.rows,
      plans: plansRes.rows,
      error: null,
    });
  } catch (err) {
    res.status(500).send("Error loading assignment page: " + err.message);
  }
});

router.post("/subscriptions/assign", isAdminLoggedIn, async (req, res) => {
  const { shop_id, plan_id, amount_paid, payment_method, transaction_id } = req.body;

  try {
    // 1. Get plan details for duration
    const planRes = await db.execute({
      sql: `SELECT duration_days FROM subscription_plans WHERE plan_id = ?`,
      args: [plan_id],
    });

    if (planRes.rows.length === 0) {
      return res.render("admin/assign_subscription", {
        adminName: req.session.adminName,
        error: "Selected plan does not exist.",
        shops: [],
        plans: [],
      });
    }

    const durationDays = planRes.rows[0].duration_days;

    // 2. Calculate Start and Expiry Dates
    const startDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const expiryDateObj = new Date();
    expiryDateObj.setDate(expiryDateObj.getDate() + Number(durationDays));
    const expiryDate = expiryDateObj.toISOString().split("T")[0];

    // 3. Insert into shop_subscriptions
    const subResult = await db.execute({
      sql: `INSERT INTO shop_subscriptions (shop_id, plan_id, start_date, expiry_date, amount_paid, subscription_status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      args: [shop_id, plan_id, startDate, expiryDate, amount_paid],
    });

    const subscriptionId = subResult.lastInsertRowid;

    // 4. Record Payment in subscription_payments
    await db.execute({
      sql: `INSERT INTO subscription_payments (subscription_id, shop_id, amount, payment_method, transaction_id, payment_status, verified_by, verified_at, payment_reference) VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, CURRENT_TIMESTAMP, ?)`,
      args: [
        subscriptionId,
        shop_id,
        amount_paid,
        payment_method || "CASH",
        transaction_id || `TXN-${Date.now()}`,
        req.session.adminId,
        "Directly verified and assigned by admin",
      ],
    });

    res.redirect("/admin/subscriptions?success=Subscription assigned and payment recorded successfully!");
  } catch (err) {
    res.status(500).send("Error assigning subscription: " + err.message);
  }
});

// Admin: Generate Password Reset Link for Shop Owner by Shop ID
router.post("/shops/:shop_id/reset-password", isAdminLoggedIn, async (req, res) => {
  const shopId = req.params.shop_id;

  try {
    // 1. Get owner details and shop contact number
    const result = await db.execute({
      sql: `SELECT u.user_id, s.shop_name, s.contact_number, u.login_id FROM users_shop u JOIN shop_list s ON u.shop_id = s.shop_id WHERE s.shop_id = ?`,
      args: [shopId],
    });

    if (result.rows.length === 0) {
      console.log(
        `PASSWORD RESET FAILED | ADMIN ID: ${req.session?.adminId || 'N/A'} | SHOP ID: ${shopId} | REASON: Shop or owner credentials not found`
      );

      return res.redirect("/admin/shops?error=Shop or owner login credentials not found.");
    }

    const owner = result.rows[0];

    // 2. Generate secure token & expiry (15 mins)
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 3. Save to database
    await db.execute({
      sql: `UPDATE users_shop SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?`,
      args: [resetToken, expiryTime, owner.user_id],
    });
    // 4. Create Reset URL & WhatsApp link
    const protocol = req.protocol;
    const host = req.get('host');
    const resetUrl = `${protocol}://${host}/shop/reset-password/${resetToken}`;

    const whatsappMessage = encodeURIComponent(
      `Hello *${owner.shop_name}* (Owner),\n\nAdmin has generated a password reset link for your account (Login ID: ${owner.login_id}).\n\nClick here to reset your password:\n${resetUrl}\n`
    );

    const cleanPhone = owner.contact_number.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

    // LOG SUCCESS
    console.info(
      `PASSWORD RESET LINK GENERATED | ADMIN ID: ${req.session?.adminId || 'N/A'} | SHOP ID: ${shopId} | SHOP NAME: ${owner.shop_name} | OWNER LOGIN ID: ${owner.login_id} | EXPIRY: ${expiryTime}`
    );

    res.redirect(`/admin/shops?success=Reset link generated! <a href="${whatsappLink}" target="_blank" class="underline font-bold text-green-700">Click here to send via WhatsApp to ${owner.shop_name}</a>`);

  } catch (err) {

    console.error(
      `PASSWORD RESET GENERATION ERROR | ADMIN ID: ${req.session?.adminId || 'N/A'} | SHOP ID: ${shopId} | ERROR: ${err.message}`
    );

    res.redirect("/admin/shops?error=Failed to generate reset link: " + err.message);
  }
});

module.exports = router;