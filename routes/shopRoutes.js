const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
// const logger = require('../utils/logger');
const crypto = require("crypto");

// Middleware to check if shop owner is logged in
const isShopLoggedIn = (req, res, next) => {
  if (req.session && req.session.shopOwnerId) {

    console.log(
      `SHOP AUTHENTICATED | SHOP ID: ${req.session.shopId || 'N/A'} | LOGIN ID: ${req.session.loginId || 'N/A'} | OWNER ID: ${req.session.shopOwnerId} | METHOD: ${req.method} | URL: ${req.originalUrl}`
    );

    return next();
  }

  console.log(
    `UNAUTHORIZED SHOP ACCESS | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | METHOD: ${req.method} | URL: ${req.originalUrl} | REASON: Missing or invalid session`
  );

  res.redirect("/shop/login");
};

// 1. Shop Owner Login Get
router.get("/login", (req, res) => {
  console.log(
    `SHOP LOGIN PAGE OPENED | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | IP: ${req.ip} | REFERER: ${req.get('referer') || 'DIRECT ACCESS'}`
  );
  res.render("shop/login", { error: null });
});

// 2. Shop Owner Login Post
router.post("/login", async (req, res) => {
  const { login_id, password } = req.body;

  // Login attempt log
  console.log(`SHOP LOGIN ATTEMPT | Login ID: ${login_id}`);

  try {
    const result = await db.execute({
      sql: `SELECT u.*, s.shop_name, s.shop_status FROM users_shop u JOIN shop_list s ON u.shop_id = s.shop_id WHERE u.login_id = ?`,
      args: [login_id],
    });

    if (result.rows.length === 0) {
      return res.render("shop/login", { error: "Invalid Login ID or password" });
    }

    const owner = result.rows[0];
    console.log(`SHOP OWNER FOUND | User ID: ${owner.user_id} | Login ID: ${owner.login_id} | Shop ID: ${owner.shop_id}`);

    // Check if shop is ACTIVE
    if (owner.shop_status && owner.shop_status !== 'ACTIVE') {
      return res.render("shop/login", { error: "Your shop is currently INACTIVE or CLOSED by the administrator. Please contact support." });
    }

    const match = await bcrypt.compare(password, owner.password);

    if (!match) {
      return res.render("shop/login", { error: "Invalid Login ID or password" });
    }

    req.session.shopOwnerId = owner.user_id;
    req.session.shopId = owner.shop_id;
    req.session.shopName = owner.shop_name;
    req.session.loginId = owner.login_id;
    console.log(`SHOP LOGIN SUCCESS | Login ID: ${owner.login_id} | Shop ID: ${owner.shop_id}`);
    res.redirect("/shop/analytics");
  } catch (err) {
    console.error(
      `SHOP LOGIN ERROR | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | IP: ${req.ip} | METHOD: ${req.method} | URL: ${req.originalUrl} | ERROR: ${err.message}`
    );

    res.render("shop/login", {
      error: "Something went wrong: " + err.message
    });
    }
});

// 3. Shop Owner profile & Profile View
router.get("/profile", isShopLoggedIn, async (req, res) => {
  try {
    const shopRes = await db.execute({
      sql: `SELECT * FROM shop_list WHERE shop_id = ?`,
      args: [req.session.shopId],
    });

    const userRes = await db.execute({
      sql: `SELECT login_id FROM users_shop WHERE shop_id = ?`,
      args: [req.session.shopId],
    });
    console.log(`PROFILE DATA LOADED | Shop Name: ${shopRes.rows[0]?.shop_name} | Login ID: ${userRes.rows[0]?.login_id} | Shop ID: ${req.session.shopId} | Shop Data: ${JSON.stringify(shopRes.rows[0])}`);
    res.render("shop/profile", {
      shopName: req.session.shopName,
      loginId: userRes.rows[0].login_id,
      shop: shopRes.rows[0],
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(
  `SHOP PROFILE LOADING FAILED | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | URL: ${req.originalUrl} | ERROR: ${err.message}`
);
    res.status(500).send("Error loading profile: " + err.message);
  }
});

// 4. Update Shop Profile Post
router.post("/profile/update", isShopLoggedIn, async (req, res) => {
  const {
    shop_name,
    shop_no,
    area,
    shop_address,
    google_link,
    contact_person,
    contact_number,
    email,
  } = req.body;

  try {
    await db.execute({
      sql: `UPDATE shop_list SET shop_name = ?, shop_no = ?, area = ?, shop_address = ?, google_link = ?, contact_person = ?, contact_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ?`,
      args: [
        shop_name,
        shop_no || null,
        area,
        shop_address,
        google_link,
        contact_person,
        contact_number,
        email,
        req.session.shopId,
      ],
    });

    // Update session shop name if changed
    req.session.shopName = shop_name;

    // Activity Log
    console.log(`SHOP PROFILE UPDATED | ${JSON.stringify({
      shop_name,
      shop_no,
      area,
      shop_address,
      google_link,
      contact_person,
      contact_number,
      email
    })}`);    

    res.redirect("/shop/profile?success=Profile updated successfully!");
  } catch (err) {
    console.error(
  `SHOP PROFILE UPDATE FAILED | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | URL: ${req.originalUrl} | SUBMITTED DATA: ${JSON.stringify(req.body)} | ERROR: ${err.message}`
);
    res.redirect("/shop/profile?error=Failed to update profile: " + err.message);
  }
});

// 5. Logout
router.get("/logout", (req, res) => {
  const shopId = req.session.shopId;
  const loginId = req.session.loginId;

  console.log(`SHOP LOGOUT | Shop ID: ${shopId} | Login ID: ${loginId}`);

  req.session.destroy((err) => {
    if (err) {
      console.error(`LOGOUT FAILED | ${err.message}`);
      return res.redirect("/shop/profile");
    }

    res.redirect("/shop/login");
  });
});

// forget password hold for now ------------------------------------------

// 1. Forgot Password Form Get
router.get("/forgot-password", (req, res) => {
  res.render("shop/forgot_password", { error: null, success: null });
});

// 2. Handle Forgot Password Request & Generate WhatsApp Link

router.post("/forgot-password", async (req, res) => {
  const { login_id } = req.body;

  try {
    console.log(
      `FORGOT PASSWORD REQUESTED | LOGIN ID: ${login_id || 'N/A'} | IP: ${req.ip}`
    );

    // Find user and their shop's contact number
    const result = await db.execute({
      sql: `SELECT u.user_id, s.contact_number, s.shop_name FROM users_shop u JOIN shop_list s ON u.shop_id = s.shop_id WHERE u.login_id = ?`,
      args: [login_id],
    });

    if (result.rows.length === 0) {
      console.log(
        `FORGOT PASSWORD FAILED | LOGIN ID: ${login_id || 'N/A'} | REASON: Login ID not found`
      );

      return res.render("shop/forgot_password", {
        error: "Login ID not found in system.",
        success: null
      });
    }

    const owner = result.rows[0];

    // Generate secure token & expiry (15 mins)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save token to database
    await db.execute({
      sql: `UPDATE users_shop SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?`,
      args: [resetToken, expiryTime, owner.user_id],
    });

    // Create Reset URL
    const protocol = req.protocol;
    const host = req.get('host');

    const resetUrl = `${protocol}://${host}/shop/reset-password/${resetToken}`;

    // Format WhatsApp Message
    const whatsappMessage = encodeURIComponent(
      `Hello *${owner.shop_name}*,\n\nYour password reset link is:\n${resetUrl}\n`
    );

    // Clean phone number
    const phone = owner.contact_number.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${phone}?text=${whatsappMessage}`;

    console.log(
      `FORGOT PASSWORD RESET LINK GENERATED | SHOP NAME: ${owner.shop_name} | OWNER ID: ${owner.user_id} | LOGIN ID: ${login_id} | EXPIRY: ${expiryTime}`
    );

    res.render("shop/forgot_password", {
      error: null,
      success: `Reset link generated successfully for ${owner.shop_name}!`,
      whatsappLink: whatsappLink,
    });

  } catch (err) {

    console.error(
      `FORGOT PASSWORD ERROR | LOGIN ID: ${login_id || 'N/A'} | IP: ${req.ip} | ERROR: ${err.message}`
    );

    res.render("shop/forgot_password", {
      error: "Something went wrong: " + err.message,
      success: null
    });
  }
});

// 3. Reset Password Form Get (Verify Token)

router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;

  console.log(
    `PASSWORD RESET PAGE OPENED | SHOP ID: ${req.session?.shopId || 'N/A'} | LOGIN ID: ${req.session?.loginId || 'N/A'} | IP: ${req.ip} | URL: ${req.originalUrl}`
  );

  try {
    const result = await db.execute({
      sql: `
        SELECT *
        FROM users_shop
        WHERE reset_token = ?
        AND julianday(reset_token_expiry) > julianday('now')
      `,
      args: [token],
    });

    if (result.rows.length === 0) {
      // Debug: Check whether token exists but expiry failed
      const debugResult = await db.execute({
        sql: `
          SELECT
            user_id,
            shop_id,
            login_id,
            reset_token_expiry,
            julianday(reset_token_expiry) AS expiry_jd,
            julianday('now') AS current_jd
          FROM users_shop
          WHERE reset_token = ?
        `,
        args: [token],
      });

      if (debugResult.rows.length > 0) {
        const data = debugResult.rows[0];

        console.log(
          `RESET TOKEN EXPIRED | SHOP ID: ${data.shop_id} | LOGIN ID: ${data.login_id} | EXPIRY: ${data.reset_token_expiry}`
        );
      } else {
        console.log(
          `RESET TOKEN NOT FOUND | IP: ${req.ip} | URL: ${req.originalUrl}`
        );
      }

      return res.send("Password reset link is invalid or has expired.");
    }

    const owner = result.rows[0];

    console.log(
      `PASSWORD RESET TOKEN VERIFIED | SHOP ID: ${owner.shop_id} | LOGIN ID: ${owner.login_id} | USER ID: ${owner.user_id}`
    );

    res.render("shop/reset_password", {
      token,
      error: null
    });

  } catch (err) {
    console.error(
      `PASSWORD RESET TOKEN VERIFICATION FAILED | IP: ${req.ip} | ERROR: ${err.message}`
    );

    res.status(500).send("Error verifying token: " + err.message);
  }
});

// 4. Handle Password Update Post
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const result = await db.execute({
      sql: `SELECT * FROM users_shop WHERE reset_token = ? AND reset_token_expiry > CURRENT_TIMESTAMP`,
      args: [token],
    });

    if (result.rows.length === 0) {
      return res.send("Password reset link is invalid or has expired.");
    }

    const user = result.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await db.execute({
      sql: `UPDATE users_shop SET password = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      args: [hashedPassword, user.user_id],
    });

    res.redirect("/shop/login?success=Password reset successfully! Please login with your new password.");
  } catch (err) {
    res.status(500).send("Error resetting password: " + err.message);
  }
});

// forget password hold for now ------------------------------------------


// --- PRODUCT MANAGEMENT ROUTES ---

// 1. View Product List (with Search & Filters)
router.get("/products", isShopLoggedIn, async (req, res) => {
  const { search, category, status } = req.query;
  const shopId = req.session.shopId;

  try {
    let query = `SELECT * FROM product_master WHERE shop_id = ?`;
    let params = [shopId];

    if (search) {
      query += ` AND (product_name LIKE ? OR product_category LIKE ? OR product_size LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND product_category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND product_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY product_id DESC`;

    const productsRes = await db.execute({ sql: query, args: params });
    
    // Get distinct categories for filter dropdown
    const categoriesRes = await db.execute({
      sql: `SELECT DISTINCT product_category FROM product_master WHERE shop_id = ? AND product_category IS NOT NULL`,
      args: [shopId],
    });

    // LOG LOADED PRODUCT DATA
    console.log(`PRODUCTS PAGE LOADED | ${JSON.stringify({
      filters: { search, category, status },
      totalProducts: productsRes.rows.length,
      products: productsRes.rows,
      categories: categoriesRes.rows
    })}`);

    res.render("shop/products", {
      shopName: req.session.shopName,
      products: productsRes.rows,
      categories: categoriesRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(`PRODUCTS FETCH FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | ERROR: ${err.message}`);    
    res.status(500).send("Error fetching products: " + err.message);
  }
});

// 2. Render Add Product Form
router.get("/products/new", isShopLoggedIn, (req, res) => {
  console.log(
    `NEW PRODUCT FORM LOADED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId}`
  );
  res.render("shop/product_new", {
    shopName: req.session.shopName,
    error: null,
  });
});

// 3. Handle Add Product Post
router.post("/products/new", isShopLoggedIn, async (req, res) => {
  const {
    product_name,
    product_category,
    product_color,
    product_size,
    product_sell_price,
    product_actual_price,
    product_stock,
  } = req.body;

  try {
    await db.execute({
      sql: `INSERT INTO product_master (shop_id, product_name, product_category, product_color, product_size, product_sell_price, product_actual_price, product_stock, product_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      args: [
        req.session.shopId,
        product_name,
        product_category,
        product_color,
        product_size,
        product_sell_price,
        product_actual_price,
        product_stock || 0,
      ],
    });
    console.log(`PRODUCT CREATED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT DATA: ${JSON.stringify(req.body)}`);

    res.redirect("/shop/products?success=Product added successfully!");
  } catch (err) {

    console.error(`PRODUCT CREATION FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT DATA: ${JSON.stringify(req.body)} | ERROR: ${err.message}`);    

    res.render("shop/product_new", {
      shopName: req.session.shopName,
      error: "Failed to add product: " + err.message,
    });
  }
});

// 4. Render Edit Product Form
router.get("/products/:id/edit", isShopLoggedIn, async (req, res) => {
  const productId = req.params.id;
  try {
    const productRes = await db.execute({
      sql: `SELECT * FROM product_master WHERE product_id = ? AND shop_id = ?`,
      args: [productId, req.session.shopId],
    });

    if (productRes.rows.length === 0) {

      console.log(
        `PRODUCT NOT FOUND | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId}`
      );

      return res.redirect("/shop/products?error=Product not found");
    }

    console.log(`PRODUCT EDIT PAGE LOADED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT DATA: ${JSON.stringify(productRes.rows[0])}`);    

    res.render("shop/product_edit", {
      shopName: req.session.shopName,
      product: productRes.rows[0],
      error: null,
    });
  } catch (err) {
    console.error(`PRODUCT EDIT PAGE FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId} | ERROR: ${err.message}`);    
    res.status(500).send("Error loading edit page: " + err.message);
  }
});

// 5. Handle Update Product Post (Includes Price, Stock Adjustment & Status)
router.post("/products/:id/edit", isShopLoggedIn, async (req, res) => {
  const productId = req.params.id;
  const {
    product_name,
    product_category,
    product_color,
    product_size,
    product_sell_price,
    product_actual_price,
    product_stock,
    product_status,
  } = req.body;

  try {
    await db.execute({
      sql: `UPDATE product_master SET product_name = ?, product_category = ?, product_color = ?, product_size = ?, product_sell_price = ?, product_actual_price = ?, product_stock = ?, product_status = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND shop_id = ?`,
      args: [
        product_name,
        product_category,
        product_color,
        product_size,
        product_sell_price,
        product_actual_price,
        product_stock,
        product_status,
        productId,
        req.session.shopId,
      ],
    });
    console.log(`PRODUCT UPDATED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId} | UPDATED DATA: ${JSON.stringify(req.body)}`);

    res.redirect("/shop/products?success=Product updated successfully!");
  } catch (err) {
    console.error(`PRODUCT UPDATE FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId} | SUBMITTED DATA: ${JSON.stringify(req.body)} | ERROR: ${err.message}`);    
    res.redirect(`/shop/products/${productId}/edit?error=Failed to update product: ` + err.message);
  }
});

// 6. Quick Toggle Product Status (ACTIVE / INACTIVE)
router.post("/products/:id/status", isShopLoggedIn, async (req, res) => {
  const productId = req.params.id;
  const { product_status } = req.body;

  try {
    const oldStatusRes = await db.execute({
      sql: `SELECT product_status FROM product_master WHERE product_id = ? AND shop_id = ?`,
      args: [productId, req.session.shopId],
    });

    await db.execute({
      sql: `UPDATE product_master SET product_status = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND shop_id = ?`,
      args: [product_status, productId, req.session.shopId],
    });

    console.log(`PRODUCT STATUS UPDATED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId} | OLD STATUS: ${oldStatusRes.rows[0]?.product_status || 'N/A'} | NEW STATUS: ${product_status}`);

    res.redirect("/shop/products?success=Product status updated!");

  } catch (err) {
    console.error(`PRODUCT STATUS UPDATE FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | PRODUCT ID: ${productId} | NEW STATUS: ${product_status} | ERROR: ${err.message}`);
    res.redirect("/shop/products?error=Failed to update status: " + err.message);
  }
});

// --- CUSTOMER MANAGEMENT ROUTES ---

// 1. View Customer List & Search (with Aggregated History Stats)
router.get("/customers", isShopLoggedIn, async (req, res) => {
  const { search } = req.query;
  const shopId = req.session.shopId;

  try {
    let query = `
      SELECT c.*, 
             COUNT(f.bill_id) as total_bills,
             COALESCE(SUM(f.spending), 0) as total_spending,
             MAX(f.created_at) as last_purchase_date,
             COALESCE(SUM(f.get_discount), 0) as total_discount
      FROM customer_master c
      LEFT JOIN customer_flow f ON c.cust_id = f.cust_id
      WHERE c.shop_id = ?
    `;
    let params = [shopId];

    if (search) {
      query += ` AND (c.cust_name LIKE ? OR c.mobile LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY c.cust_id ORDER BY c.cust_id DESC`;

    const customersRes = await db.execute({ sql: query, args: params });
    // LOG CUSTOMER DATA
    console.log(
      `CUSTOMERS PAGE LOADED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | SEARCH: ${search || 'NONE'} | TOTAL CUSTOMERS: ${customersRes.rows.length} | CUSTOMER DATA: ${JSON.stringify(customersRes.rows)}`
    );

    res.render("shop/customers", {
      shopName: req.session.shopName,
      customers: customersRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(`CUSTOMERS FETCH FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | SEARCH: ${search || 'NONE'} | ERROR: ${err.message}`);
    res.status(500).send("Error fetching customers: " + err.message);
  }
});

// 2. Render Add Customer Form
router.get("/customers/new", isShopLoggedIn, (req, res) => {
  console.log(
    `NEW CUSTOMER FORM LOADED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId}`
  );
  res.render("shop/customer_new", {
    shopName: req.session.shopName,
    error: null,
  });
});

// 3. Handle Add Customer (Unique mobile per shop enforced by DB)
router.post("/customers/new", isShopLoggedIn, async (req, res) => {
  const { cust_name, mobile, email, address } = req.body;
  const shopId = req.session.shopId;

  try {
    await db.execute({
      sql: `INSERT INTO customer_master (shop_id, cust_name, mobile, email, address) VALUES (?, ?, ?, ?, ?)`,
      args: [shopId, cust_name, mobile, email || null, address || null],
    });

    console.log(
      `CUSTOMER CREATED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER DATA: ${JSON.stringify(req.body)}`
    );    

    res.redirect("/shop/customers?success=Customer added successfully!");
  } catch (err) {
    console.error(
      `CUSTOMER CREATION FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER DATA: ${JSON.stringify(req.body)} | ERROR: ${err.message}`
    );    
    res.render("shop/customer_new", {
      shopName: req.session.shopName,
      error: "Failed to add customer (Mobile number already exists in this shop): " + err.message,
    });
  }
});

// 4. Render Edit Customer Form
router.get("/customers/:id/edit", isShopLoggedIn, async (req, res) => {
  const custId = req.params.id;
  try {
    const custRes = await db.execute({
      sql: `SELECT * FROM customer_master WHERE cust_id = ? AND shop_id = ?`,
      args: [custId, req.session.shopId],
    });

    if (custRes.rows.length === 0) {

      console.log(
        `CUSTOMER NOT FOUND | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId}`
      );

      return res.redirect("/shop/customers?error=Customer not found");
    }

    console.log(
      `CUSTOMER EDIT PAGE LOADED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER DATA: ${JSON.stringify(custRes.rows[0])}`
    );
    res.render("shop/customer_edit", {
      shopName: req.session.shopName,
      customer: custRes.rows[0],
      error: null,
    });
  } catch (err) {
    console.error(
      `CUSTOMER EDIT PAGE FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId} | ERROR: ${err.message}`
    );    
    res.status(500).send("Error loading edit page: " + err.message);
  }
});

// 5. Handle Update Customer Post
router.post("/customers/:id/edit", isShopLoggedIn, async (req, res) => {
  const custId = req.params.id;
  const { cust_name, mobile, email, address } = req.body;

  try {
    await db.execute({
      sql: `UPDATE customer_master SET cust_name = ?, mobile = ?, email = ?, address = ? WHERE cust_id = ? AND shop_id = ?`,
      args: [cust_name, mobile, email || null, address || null, custId, req.session.shopId],
    });
    console.log(
      `CUSTOMER UPDATED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId} | UPDATED DATA: ${JSON.stringify(req.body)}`
    );
    res.redirect("/shop/customers?success=Customer updated successfully!");
  } catch (err) {
    console.error(
      `CUSTOMER UPDATE FAILED | SHOP ID: ${req.session.shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId} | SUBMITTED DATA: ${JSON.stringify(req.body)} | ERROR: ${err.message}`
    );
    res.redirect(`/shop/customers/${custId}/edit?error=Failed to update customer (Mobile might already exist): ` + err.message);
  }
});

// 6. Customer Purchase History Details
router.get("/customers/:id/history", isShopLoggedIn, async (req, res) => {
  const custId = req.params.id;
  const shopId = req.session.shopId;

  try {
    const custRes = await db.execute({
      sql: `SELECT * FROM customer_master WHERE cust_id = ? AND shop_id = ?`,
      args: [custId, shopId],
    });

    if (custRes.rows.length === 0) {

      console.log(
        `CUSTOMER HISTORY NOT FOUND | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId}`
      );

      return res.redirect("/shop/customers?error=Customer not found");
    }

    const flowsRes = await db.execute({
      sql: `
        SELECT f.*, b.total_amount, b.final_amount, b.payment_status 
        FROM customer_flow f
        JOIN digi_bill b ON f.bill_id = b.bill_id
        WHERE f.cust_id = ? AND f.shop_id = ?
        ORDER BY f.flow_id DESC
      `,
      args: [custId, shopId],
    });
    // LOG CUSTOMER PURCHASE HISTORY
    console.log(
      `CUSTOMER HISTORY LOADED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId} | CUSTOMER DATA: ${JSON.stringify(custRes.rows[0])} | TOTAL PURCHASES: ${flowsRes.rows.length} | PURCHASE HISTORY: ${JSON.stringify(flowsRes.rows)}`
    );
    res.render("shop/customer_history", {
      shopName: req.session.shopName,
      customer: custRes.rows[0],
      purchases: flowsRes.rows,
    });
  } catch (err) {
    console.error(
      `CUSTOMER HISTORY FETCH FAILED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | CUSTOMER ID: ${custId} | ERROR: ${err.message}`
    );    
    res.status(500).send("Error fetching purchase history: " + err.message);
  }
});

// --- DIGITAL BILLING & POS ROUTES ---

// 1. Bill History & Management List
router.get("/billing", isShopLoggedIn, async (req, res) => {
  const { search } = req.query;
  const shopId = req.session.shopId;

  try {
    let query = `
      SELECT b.*, c.cust_name, c.mobile 
      FROM digi_bill b
      LEFT JOIN customer_master c ON b.cust_id = c.cust_id
      WHERE b.shop_id = ?
    `;
    let params = [shopId];

    if (search) {
      query += ` AND (b.bill_id LIKE ? OR c.cust_name LIKE ? OR c.mobile LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY b.bill_id DESC`;

    const billsRes = await db.execute({ sql: query, args: params });
    // LOG LOADED BILLING DATA
    console.log(
      `BILLING PAGE LOADED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | SEARCH: ${search || 'NONE'} | TOTAL BILLS: ${billsRes.rows.length} | BILL DATA: ${JSON.stringify(billsRes.rows)}`
    );
    res.render("shop/billing_list", {
      shopName: req.session.shopName,
      bills: billsRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(
      `BILLING FETCH FAILED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | SEARCH: ${search || 'NONE'} | ERROR: ${err.message}`
    );
    res.status(500).send("Error fetching bills: " + err.message);
  }
});

// 2. Render New Bill / POS Checkout Page
router.get("/billing/new", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;
  const loginId = req.session.loginId;

  try {
    const customersRes = await db.execute({
      sql: `SELECT cust_id, cust_name, mobile FROM customer_master WHERE shop_id = ? ORDER BY cust_name ASC`,
      args: [shopId],
    });

    const productsRes = await db.execute({
      sql: `SELECT product_id, product_name, product_size, product_color, product_sell_price, product_stock FROM product_master WHERE shop_id = ? AND product_status = 'ACTIVE' AND product_stock > 0`,
      args: [shopId],
    });
    // LOG POS CHECKOUT DATA
    console.log(
      `NEW BILLING PAGE LOADED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | TOTAL CUSTOMERS: ${customersRes.rows.length} | CUSTOMERS: ${JSON.stringify(customersRes.rows)} | TOTAL PRODUCTS: ${productsRes.rows.length} | AVAILABLE PRODUCTS: ${JSON.stringify(productsRes.rows)}`
    );
    res.render("shop/billing_new", {
      shopName: req.session.shopName,
      customers: customersRes.rows,
      products: productsRes.rows,
      error: null,
    });
  } catch (err) {
    console.error(
      `POS CHECKOUT LOAD FAILED | SHOP ID: ${shopId} | LOGIN ID: ${req.session.loginId} | ERROR: ${err.message}`
    );
    res.status(500).send("Error loading POS checkout: " + err.message);
  }
});

// 3. Handle Create Bill (Atomic Transaction + Stock Deduction + Customer Flow)
router.post("/billing/create", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;
  const loginId = req.session.loginId;

  const { cust_id, cust_name, mobile, discount, payment_status, items } = req.body; 

  if (!items || items.length === 0) {
    console.log(
      `BILLING CANCELLED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | REASON: No products selected`
    );

    return res.redirect("/shop/billing/new?error=Please select at least one product.");
  }


  const tx = await db.transaction("write");
  try {
    let finalCustId = cust_id || null ;

    // Agar existing customer select nahi kiya, par naya name aur mobile diya hai toh customer table me save/get karo
    if (!finalCustId && cust_name && mobile) {
      // Check if mobile already exists for this shop
      const existingCust = await tx.execute({
        sql: `SELECT cust_id FROM customer_master WHERE shop_id = ? AND mobile = ?`,
        args: [shopId, mobile],
      });

      if (existingCust.rows.length > 0) {
        finalCustId = existingCust.rows[0].cust_id;
        console.log(
          `EXISTING CUSTOMER FOUND | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | CUSTOMER ID: ${finalCustId}`
        );
      } else {
        const newCustRes = await tx.execute({
          sql: `INSERT INTO customer_master (shop_id, cust_name, mobile) VALUES (?, ?, ?)`,
          args: [shopId, cust_name, mobile],
        });
        finalCustId = newCustRes.lastInsertRowid;
        console.log(
          `NEW CUSTOMER CREATED DURING BILLING | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | CUSTOMER ID: ${finalCustId} | NAME: ${cust_name}`
        );        
      }
    }

    if (!finalCustId) {
      throw new Error("Customer Name and Mobile Number are required for billing!");
    }

    let totalAmount = 0;
    const processedItems = [];

    for (let item of items) {
      const prodRes = await tx.execute({
        sql: `SELECT product_id, product_name, product_sell_price, product_actual_price, product_stock FROM product_master WHERE product_id = ? AND shop_id = ?`,
        args: [item.product_id, shopId],
      });

      if (prodRes.rows.length === 0) {
        throw new Error(`Product not found.`);
      }

      const product = prodRes.rows[0];
      const qty = parseInt(item.quantity);

      if (product.product_stock < qty) {
        throw new Error(`Insufficient stock for product: ${product.product_name}`);
      }

      const subtotal = product.product_sell_price * qty;
      totalAmount += subtotal;

      processedItems.push({
        product_id: product.product_id,
        quantity: qty,
        price: product.product_sell_price,
        purchase_price: product.product_actual_price, // Purchase price snapshot for profit calculation!        
        subtotal: subtotal,
      });
      console.log("Processed Items:", processedItems);
    }
    console.log(
      `BILLING ITEMS PROCESSED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | ITEMS: ${JSON.stringify(processedItems)}`
    );
    const discountAmount = parseFloat(discount) || 0;
    const finalAmount = Math.max(0, totalAmount - discountAmount);

    // Insert bill
    const billRes = await tx.execute({
      sql: `INSERT INTO digi_bill (shop_id, cust_id, total_amount, discount, final_amount, payment_status) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [shopId, finalCustId, totalAmount, discountAmount, finalAmount, payment_status || 'UNPAID'],
    });

    const billId = billRes.lastInsertRowid;

    // Insert items & reduce stock
    for (let pItem of processedItems) {
      await tx.execute({
        sql: `INSERT INTO digi_bill_items (bill_id, product_id, quantity, price, purchase_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [billId, pItem.product_id, pItem.quantity, pItem.price, pItem.purchase_price, pItem.subtotal],
      });

      await tx.execute({
        sql: `UPDATE product_master SET product_stock = product_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
        args: [pItem.quantity, pItem.product_id],
      });
    }
    console.log(
      `PRODUCT STOCK UPDATED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | BILL ID: ${billId} | ITEMS: ${JSON.stringify(processedItems.map(item => ({ product_id: item.product_id, quantity_sold: item.quantity })))}`
    );
    // Update customer flow
    await tx.execute({
      sql: `INSERT INTO customer_flow (cust_id, shop_id, bill_id, spending, get_discount) VALUES (?, ?, ?, ?, ?)`,
      args: [finalCustId, shopId, billId, finalAmount, discountAmount],
    });

    await tx.commit();
    console.log(
      `BILLING SUCCESS | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | BILL ID: ${billId} | CUSTOMER ID: ${finalCustId} | TOTAL: ${totalAmount} | DISCOUNT: ${discountAmount} | FINAL AMOUNT: ${finalAmount} | PAYMENT STATUS: ${payment_status || 'UNPAID'} | ITEMS: ${JSON.stringify(processedItems)}`
    );    
    res.redirect(`/shop/billing/${billId}`);
  } catch (err) {
    await tx.rollback();
    console.error(
      `BILLING FAILED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | CUSTOMER ID: ${finalCustId || cust_id || 'N/A'} | CUSTOMER NAME: ${cust_name || 'N/A'} | ITEMS: ${JSON.stringify(items)} | ERROR: ${err.message}`
    );    
    res.redirect(`/shop/billing/new?error=Billing failed: ${err.message}`);
  }
});

// 4. View Digital Invoice & WhatsApp Share Option
router.get("/billing/:id", isShopLoggedIn, async (req, res) => {
  const billId = req.params.id;
  const shopId = req.session.shopId;
  const loginId = req.session.loginId;

  try {
    const billRes = await db.execute({
      sql: `SELECT b.*, c.cust_name, c.mobile, c.address, s.shop_name, s.shop_address, s.contact_number, s.area 
            FROM digi_bill b
            LEFT JOIN customer_master c ON b.cust_id = c.cust_id
            JOIN shop_list s ON b.shop_id = s.shop_id
            WHERE b.bill_id = ? AND b.shop_id = ?`,
      args: [billId, shopId],
    });

    if (billRes.rows.length === 0) {
      console.log(
        `INVOICE NOT FOUND | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | BILL ID: ${billId}`
      );

      return res.redirect("/shop/billing?error=Bill not found");
    }

    const itemsRes = await db.execute({
      sql: `SELECT i.*, p.product_name, p.product_size, p.product_color 
            FROM digi_bill_items i
            JOIN product_master p ON i.product_id = p.product_id
            WHERE i.bill_id = ?`,
      args: [billId],
    });
    console.log(
      `INVOICE LOADED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | BILL ID: ${billId} | CUSTOMER: ${billRes.rows[0].cust_name} | TOTAL AMOUNT: ${billRes.rows[0].total_amount} | FINAL AMOUNT: ${billRes.rows[0].final_amount} | PAYMENT STATUS: ${billRes.rows[0].payment_status} | TOTAL ITEMS: ${itemsRes.rows.length} | ITEMS: ${JSON.stringify(itemsRes.rows)}`
    );
    res.render("shop/invoice", {
      shopName: req.session.shopName,
      bill: billRes.rows[0],
      items: itemsRes.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(
      `INVOICE LOAD FAILED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | BILL ID: ${billId} | ERROR: ${err.message}`
    );    
    res.status(500).send("Error loading invoice: " + err.message);
  }
});

// --- SALES & ANALYTICS ROUTES ---
router.get("/analytics", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;
  const loginId = req.session.loginId;
  try {
    const { filter = "month", startDate, endDate } = req.query;

    let start = startDate;
    let end = endDate;

    if (filter !== "custom") {
      const today = new Date();
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      end = formatDate(today);
      const from = new Date(today);

      if (filter === "today") {
        start = end;
      } else if (filter === "yesterday") {
        from.setDate(from.getDate() - 1);
        start = end = formatDate(from);
      } else if (filter === "7days") {
        from.setDate(from.getDate() - 6);
        start = formatDate(from);
      } else if (filter === "30days") {
        from.setDate(from.getDate() - 29);
        start = formatDate(from);
      } else {
        from.setDate(1);
        start = formatDate(from);
      }
    }
    console.log(
      `ANALYTICS PAGE REQUESTED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | FILTER: ${filter} | START DATE: ${start} | END DATE: ${end}`
    );
    if (!start || !end) {
      throw new Error("Please select valid date range");
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const dateCondition = `
      b.shop_id = ?
      AND DATE(b.created_at) >= DATE(?)
      AND DATE(b.created_at) <= DATE(?)
    `;

    // 1. Sales Overview
    const overviewRes = await db.execute({
      sql: `
        SELECT
          COUNT(*) AS total_bills,
          COALESCE(SUM(final_amount), 0) AS total_sales,
          COALESCE(SUM(discount), 0) AS total_discount,
          COALESCE(AVG(final_amount), 0) AS average_bill,
          SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_bills,
          SUM(CASE WHEN payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_bills
        FROM digi_bill b
        WHERE ${dateCondition}
      `,
      args: [shopId, start, end]
    });

    // 2. Profit and Loss
    const profitRes = await db.execute({
      sql: `
        SELECT
          COALESCE(SUM(
            CASE WHEN (i.price - i.purchase_price) > 0
            THEN (i.price - i.purchase_price) * i.quantity ELSE 0 END
          ), 0) AS gross_profit,

          COALESCE(SUM(
            CASE WHEN (i.price - i.purchase_price) < 0
            THEN ABS(i.price - i.purchase_price) * i.quantity ELSE 0 END
          ), 0) AS total_loss,

          COALESCE(SUM(
            (i.price - i.purchase_price) * i.quantity
          ), 0) AS net_item_profit

        FROM digi_bill_items i
        JOIN digi_bill b ON i.bill_id = b.bill_id
        WHERE ${dateCondition}
      `,
      args: [shopId, start, end]
    });

    const overview = overviewRes.rows[0];
    const profit = profitRes.rows[0];

    const netProfit =
      Number(profit.net_item_profit) -
      Number(overview.total_discount);

    // 3. Customer Analytics
    const customerRes = await db.execute({
      sql: `
        SELECT
          COUNT(DISTINCT cust_id) AS unique_customers,
          COUNT(*) AS customer_visits
        FROM digi_bill
        WHERE shop_id = ?
          AND DATE(created_at) >= DATE(?)
          AND DATE(created_at) <= DATE(?)
      `,
      args: [shopId, start, end]
    });

    const newCustomerRes = await db.execute({
      sql: `
        SELECT COUNT(*) AS new_customers
        FROM customer_master
        WHERE shop_id = ?
          AND DATE(created_at) >= DATE(?)
          AND DATE(created_at) <= DATE(?)
      `,
      args: [shopId, start, end]
    });

    // 4. Inventory
    const inventoryRes = await db.execute({
      sql: `
        SELECT
          COUNT(*) AS total_products,
          COALESCE(SUM(product_stock), 0) AS total_stock,
          COALESCE(SUM(product_stock * product_actual_price), 0) AS stock_value,
          SUM(CASE WHEN product_stock > 0 AND product_stock <= 5 THEN 1 ELSE 0 END) AS low_stock,
          SUM(CASE WHEN product_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock
        FROM product_master
        WHERE shop_id = ?
      `,
      args: [shopId]
    });

    // 5. Daily Sales Graph
    const chartRes = await db.execute({
      sql: `
        SELECT
          DATE(created_at) AS sale_date,
          SUM(final_amount) AS sales
        FROM digi_bill
        WHERE shop_id = ?
          AND DATE(created_at) >= DATE(?)
          AND DATE(created_at) <= DATE(?)
        GROUP BY DATE(created_at)
        ORDER BY sale_date ASC
      `,
      args: [shopId, start, end]
    });

    // 6. Top Customers
    const topCustomersRes = await db.execute({
      sql: `
        SELECT
          c.cust_name,
          c.mobile,
          SUM(b.final_amount) AS total_spent,
          COUNT(b.bill_id) AS total_bills
        FROM digi_bill b
        JOIN customer_master c ON b.cust_id = c.cust_id
        WHERE ${dateCondition}
        GROUP BY c.cust_id
        ORDER BY total_spent DESC
        LIMIT 5
      `,
      args: [shopId, start, end]
    });

    // 7. Best Sellers
    const bestSellersRes = await db.execute({
      sql: `
        SELECT
          p.product_name,
          p.product_size,
          p.product_color,
          SUM(i.quantity) AS total_qty,
          SUM(i.subtotal) AS revenue
        FROM digi_bill_items i
        JOIN digi_bill b ON i.bill_id = b.bill_id
        JOIN product_master p ON i.product_id = p.product_id
        WHERE ${dateCondition}
        GROUP BY p.product_id
        ORDER BY total_qty DESC
        LIMIT 5
      `,
      args: [shopId, start, end]
    });

    // 8. Transaction Count
    const countRes = await db.execute({
      sql: `
        SELECT COUNT(*) AS total
        FROM digi_bill b
        WHERE ${dateCondition}
      `,
      args: [shopId, start, end]
    });

    const totalRecords = Number(countRes.rows[0].total);
    const totalPages = Math.ceil(totalRecords / limit);

    // 9. Transactions
    const transactionsRes = await db.execute({
      sql: `
        SELECT
          b.bill_id,
          b.total_amount,
          b.discount,
          b.final_amount,
          b.payment_status,
          b.created_at,
          c.cust_name,
          c.mobile
        FROM digi_bill b
        LEFT JOIN customer_master c ON b.cust_id = c.cust_id
        WHERE ${dateCondition}
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [shopId, start, end, limit, offset]
    });
    // ANALYTICS DATA LOG
    console.log(
      `ANALYTICS DATA LOADED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | DATE RANGE: ${start} TO ${end} | OVERVIEW: ${JSON.stringify(overview)} | PROFIT: ${JSON.stringify({ ...profit, net_profit: netProfit })} | CUSTOMERS: ${JSON.stringify(customerRes.rows[0])} | NEW CUSTOMERS: ${newCustomerRes.rows[0].new_customers} | INVENTORY: ${JSON.stringify(inventoryRes.rows[0])} | CHART RECORDS: ${chartRes.rows.length} | TOP CUSTOMERS: ${topCustomersRes.rows.length} | BEST SELLERS: ${bestSellersRes.rows.length} | TOTAL TRANSACTIONS: ${totalRecords} | CURRENT PAGE: ${page} | TRANSACTIONS: ${JSON.stringify(transactionsRes.rows)}`
    );
    res.render("shop/analytics", {
      shopName: req.session.shopName,
      filter,
      startDate: start,
      endDate: end,
      page,
      totalPages,
      overview,
      profit: {
        ...profit,
        net_profit: netProfit
      },
      customers: customerRes.rows[0],
      newCustomers: newCustomerRes.rows[0].new_customers,
      inventory: inventoryRes.rows[0],
      chartData: chartRes.rows,
      topCustomers: topCustomersRes.rows,
      bestSellers: bestSellersRes.rows,
      transactions: transactionsRes.rows
    });

  } catch (err) {
    console.error(
      `ANALYTICS LOAD FAILED | SHOP ID: ${shopId} | LOGIN ID: ${loginId} | FILTER: ${req.query.filter || 'month'} | START DATE: ${startDate || 'N/A'} | END DATE: ${endDate || 'N/A'} | ERROR: ${err.message}`
    );
    res.status(500).send("Error loading analytics: " + err.message);
  }
});


module.exports = router;