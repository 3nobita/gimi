const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// Middleware to check if shop owner is logged in
const isShopLoggedIn = (req, res, next) => {
  if (req.session && req.session.shopOwnerId) {
    return next();
  }
  res.redirect("/shop/login");
};

// 1. Shop Owner Login Get
router.get("/login", (req, res) => {
  res.render("shop/login", { error: null });
});

// 2. Shop Owner Login Post
router.post("/login", async (req, res) => {
  const { login_id, password } = req.body;
  try {
    const result = await db.execute({
      sql: `SELECT u.*, s.shop_name, s.shop_status FROM users_shop u JOIN shop_list s ON u.shop_id = s.shop_id WHERE u.login_id = ?`,
      args: [login_id],
    });

    if (result.rows.length === 0) {
      return res.render("shop/login", { error: "Invalid Login ID or password" });
    }

    const owner = result.rows[0];
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

    res.redirect("/shop/analytics");
  } catch (err) {
    res.render("shop/login", { error: "Something went wrong: " + err.message });
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

    res.render("shop/profile", {
      shopName: req.session.shopName,
      loginId: userRes.rows[0].login_id,
      shop: shopRes.rows[0],
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
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

    res.redirect("/shop/profile?success=Profile updated successfully!");
  } catch (err) {
    res.redirect("/shop/profile?error=Failed to update profile: " + err.message);
  }
});

// 5. Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/shop/login");
  });
});

// 1. Forgot Password Form Get
router.get("/forgot-password", (req, res) => {
  res.render("shop/forgot_password", { error: null, success: null });
});

// 2. Handle Forgot Password Request & Generate WhatsApp Link
router.post("/forgot-password", async (req, res) => {
  const { login_id } = req.body;
  try {
    // Find user and their shop's contact number
    const result = await db.execute({
      sql: `SELECT u.user_id, s.contact_number, s.shop_name FROM users_shop u JOIN shop_list s ON u.shop_id = s.shop_id WHERE u.login_id = ?`,
      args: [login_id],
    });

    if (result.rows.length === 0) {
      return res.render("shop/forgot_password", { error: "Login ID not found in system.", success: null });
    }

    const owner = result.rows[0];
    
    // Generate a simple unique random token & expiry (e.g. valid for 15 mins)
    // const resetToken = Math.random().toString(36.substring(2)) + Date.now().toString(36);
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins from now

    // Save token to database
    await db.execute({
      sql: `UPDATE users_shop SET reset_token = ?, reset_token_expiry = ? WHERE user_id = ?`,
      args: [resetToken, expiryTime, owner.user_id],
    });

    // Create Reset URL

    // Ye automatically detect kar lega ki request localhost se aa rahi hai ya Vercel live domain se
    const protocol = req.protocol; // http ya https
    const host = req.get('host');   // localhost:3000 ya tere-app-ka-naam.vercel.app

    const resetUrl = `${protocol}://${host}/shop/reset-password/${resetToken}`;
    // const resetUrl = `http://localhost:3000/shop/reset-password/${resetToken}`;

    // Format WhatsApp Message
    const whatsappMessage = encodeURIComponent(
      `Hello *${owner.shop_name}*,\n\nYour password reset link is:\n${resetUrl}\n\n(This link is valid for 15 minutes). If you did not request this, please ignore.`
    );
    
    // Clean phone number (remove spaces/symbols if any)
    const phone = owner.contact_number.replace(/\D/g, "");
    const whatsappLink = `https://wa.me/${phone}?text=${whatsappMessage}`;

    res.render("shop/forgot_password", {
      error: null,
      success: `Reset link generated successfully for ${owner.shop_name}!`,
      whatsappLink: whatsappLink,
    });
  } catch (err) {
    res.render("shop/forgot_password", { error: "Something went wrong: " + err.message, success: null });
  }
});

// 3. Reset Password Form Get (Verify Token)
router.get("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const result = await db.execute({
      sql: `SELECT * FROM users_shop WHERE reset_token = ? AND reset_token_expiry > CURRENT_TIMESTAMP`,
      args: [token],
    });

    if (result.rows.length === 0) {
      return res.send("Password reset link is invalid or has expired.");
    }

    res.render("shop/reset_password", { token, error: null });
  } catch (err) {
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

    res.render("shop/products", {
      shopName: req.session.shopName,
      products: productsRes.rows,
      categories: categoriesRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching products: " + err.message);
  }
});

// 2. Render Add Product Form
router.get("/products/new", isShopLoggedIn, (req, res) => {
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

    res.redirect("/shop/products?success=Product added successfully!");
  } catch (err) {
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
      return res.redirect("/shop/products?error=Product not found");
    }

    res.render("shop/product_edit", {
      shopName: req.session.shopName,
      product: productRes.rows[0],
      error: null,
    });
  } catch (err) {
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

    res.redirect("/shop/products?success=Product updated successfully!");
  } catch (err) {
    res.redirect(`/shop/products/${productId}/edit?error=Failed to update product: ` + err.message);
  }
});

// 6. Quick Toggle Product Status (ACTIVE / INACTIVE)
router.post("/products/:id/status", isShopLoggedIn, async (req, res) => {
  const productId = req.params.id;
  const { product_status } = req.body;

  try {
    await db.execute({
      sql: `UPDATE product_master SET product_status = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND shop_id = ?`,
      args: [product_status, productId, req.session.shopId],
    });
    res.redirect("/shop/products?success=Product status updated!");
  } catch (err) {
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

    res.render("shop/customers", {
      shopName: req.session.shopName,
      customers: customersRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching customers: " + err.message);
  }
});

// 2. Render Add Customer Form
router.get("/customers/new", isShopLoggedIn, (req, res) => {
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

    res.redirect("/shop/customers?success=Customer added successfully!");
  } catch (err) {
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
      return res.redirect("/shop/customers?error=Customer not found");
    }

    res.render("shop/customer_edit", {
      shopName: req.session.shopName,
      customer: custRes.rows[0],
      error: null,
    });
  } catch (err) {
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

    res.redirect("/shop/customers?success=Customer updated successfully!");
  } catch (err) {
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

    res.render("shop/customer_history", {
      shopName: req.session.shopName,
      customer: custRes.rows[0],
      purchases: flowsRes.rows,
    });
  } catch (err) {
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

    res.render("shop/billing_list", {
      shopName: req.session.shopName,
      bills: billsRes.rows,
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error fetching bills: " + err.message);
  }
});

// 2. Render New Bill / POS Checkout Page
router.get("/billing/new", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;
  try {
    const customersRes = await db.execute({
      sql: `SELECT cust_id, cust_name, mobile FROM customer_master WHERE shop_id = ? ORDER BY cust_name ASC`,
      args: [shopId],
    });

    const productsRes = await db.execute({
      sql: `SELECT product_id, product_name, product_size, product_color, product_sell_price, product_stock FROM product_master WHERE shop_id = ? AND product_status = 'ACTIVE' AND product_stock > 0`,
      args: [shopId],
    });

    res.render("shop/billing_new", {
      shopName: req.session.shopName,
      customers: customersRes.rows,
      products: productsRes.rows,
      error: null,
    });
  } catch (err) {
    res.status(500).send("Error loading POS checkout: " + err.message);
  }
});

// 3. Handle Create Bill (Atomic Transaction + Stock Deduction + Customer Flow)
router.post("/billing/create", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;
  const { cust_id, cust_name, mobile, discount, payment_status, items } = req.body; 

  if (!items || items.length === 0) {
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
      } else {
        const newCustRes = await tx.execute({
          sql: `INSERT INTO customer_master (shop_id, cust_name, mobile) VALUES (?, ?, ?)`,
          args: [shopId, cust_name, mobile],
        });
        finalCustId = newCustRes.lastInsertRowid;
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

    // Update customer flow
    await tx.execute({
      sql: `INSERT INTO customer_flow (cust_id, shop_id, bill_id, spending, get_discount) VALUES (?, ?, ?, ?, ?)`,
      args: [finalCustId, shopId, billId, finalAmount, discountAmount],
    });

    await tx.commit();
    res.redirect(`/shop/billing/${billId}`);
  } catch (err) {
    await tx.rollback();
    res.redirect(`/shop/billing/new?error=Billing failed: ${err.message}`);
  }
});

// 4. View Digital Invoice & WhatsApp Share Option
router.get("/billing/:id", isShopLoggedIn, async (req, res) => {
  const billId = req.params.id;
  const shopId = req.session.shopId;

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
      return res.redirect("/shop/billing?error=Bill not found");
    }

    const itemsRes = await db.execute({
      sql: `SELECT i.*, p.product_name, p.product_size, p.product_color 
            FROM digi_bill_items i
            JOIN product_master p ON i.product_id = p.product_id
            WHERE i.bill_id = ?`,
      args: [billId],
    });

    res.render("shop/invoice", {
      shopName: req.session.shopName,
      bill: billRes.rows[0],
      items: itemsRes.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Error loading invoice: " + err.message);
  }
});

// --- SALES & ANALYTICS ROUTES ---
router.get("/analytics", isShopLoggedIn, async (req, res) => {
  const shopId = req.session.shopId;

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
    res.status(500).send("Error loading analytics: " + err.message);
  }
});


module.exports = router;