const db = require("./config/db");

async function createTables() {
  try {
    console.log("Creating tables...");

    // 1. Shop List Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shop_list (
        shop_id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_name TEXT NOT NULL,
        shop_no TEXT UNIQUE,
        area TEXT NOT NULL,
        shop_address TEXT,
        google_link TEXT,
        contact_person TEXT,
        contact_number TEXT,
        email TEXT,
        shop_status TEXT DEFAULT 'ACTIVE' CHECK(shop_status IN ('ACTIVE', 'INACTIVE', 'CLOSED')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Shop Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users_shop (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL UNIQUE,
        login_id TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id)
      );
    `);

    // 3. Platform Admin Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS platform_admin (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'SUPER_ADMIN' CHECK(role IN ('SUPER_ADMIN', 'ADMIN')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Subscription Plans Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_name TEXT NOT NULL,
        plan_price INTEGER NOT NULL,
        duration_days INTEGER NOT NULL,
        plan_status TEXT DEFAULT 'ACTIVE' CHECK(plan_status IN ('ACTIVE', 'INACTIVE')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Shop Subscriptions Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shop_subscriptions (
        subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        amount_paid INTEGER NOT NULL,
        subscription_status TEXT DEFAULT 'ACTIVE' CHECK(subscription_status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id),
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
      );
    `);

    // 6. Subscription Payments Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        payment_method TEXT,
        transaction_id TEXT UNIQUE,
        payment_status TEXT DEFAULT 'PENDING' CHECK(payment_status IN ('SUCCESS', 'FAILED', 'PENDING')),
        verified_by INTEGER,
        verified_at TEXT,
        payment_reference TEXT,
        payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subscription_id) REFERENCES shop_subscriptions(subscription_id),
        FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id),
        FOREIGN KEY (verified_by) REFERENCES platform_admin(admin_id)
      );
    `);

await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS product_master (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,

        product_name TEXT NOT NULL,
        product_category TEXT,
        product_color TEXT,
        product_size TEXT,

        product_sell_price INTEGER NOT NULL,
        product_actual_price INTEGER NOT NULL,

        product_stock INTEGER DEFAULT 0,

        product_status TEXT DEFAULT 'ACTIVE'
            CHECK(product_status IN ('ACTIVE', 'INACTIVE')),

        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id)
    );

    CREATE INDEX IF NOT EXISTS idx_product_shop
    ON product_master(shop_id);

    CREATE INDEX IF NOT EXISTS idx_product_name
    ON product_master(product_name);
`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS customer_master (
      cust_id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      cust_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id),
      UNIQUE(shop_id, mobile)
  );
    `)

  await db.executeMultiple(`
    
    CREATE TABLE IF NOT EXISTS digi_bill (
      bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      cust_id INTEGER,

      total_amount INTEGER NOT NULL DEFAULT 0,
      discount INTEGER DEFAULT 0,
      final_amount INTEGER NOT NULL DEFAULT 0,

      payment_status TEXT DEFAULT 'UNPAID'
          CHECK(payment_status IN ('PAID', 'UNPAID', 'PARTIAL')),

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id),
      FOREIGN KEY (cust_id) REFERENCES customer_master(cust_id)
  );

  CREATE INDEX IF NOT EXISTS idx_bill_shop ON digi_bill(shop_id);
  CREATE INDEX IF NOT EXISTS idx_bill_customer ON digi_bill(cust_id);
    
    `)

await db.executeMultiple(`
  
  CREATE TABLE IF NOT EXISTS digi_bill_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,

    FOREIGN KEY (bill_id) REFERENCES digi_bill(bill_id),
    FOREIGN KEY (product_id) REFERENCES product_master(product_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_items ON digi_bill_items(bill_id);

  `)

await db.executeMultiple(`
  CREATE TABLE IF NOT EXISTS customer_flow (
    flow_id INTEGER PRIMARY KEY AUTOINCREMENT,

    cust_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    bill_id INTEGER NOT NULL,

    spending INTEGER DEFAULT 0,
    get_discount INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (cust_id) REFERENCES customer_master(cust_id),
    FOREIGN KEY (shop_id) REFERENCES shop_list(shop_id),
    FOREIGN KEY (bill_id) REFERENCES digi_bill(bill_id),

    UNIQUE(bill_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_shop ON customer_flow(cust_id, shop_id);
  `)

    // // Add these columns to users_shop table if not already present
    // await db.execute(` ALTER TABLE users_shop ADD COLUMN reset_token TEXT;`);
    // await db.execute(`ALTER TABLE users_shop ADD COLUMN reset_token_expiry TEXT; `);
    // await db.execute(`ALTER TABLE customer_master ADD COLUMN email TEXT;`);
    // await db.execute(`ALTER TABLE customer_master ADD COLUMN address TEXT;`);
    // await db.execute(`ALTER TABLE customer_master ADD COLUMN email TEXT`);
    // await db.execute(`ALTER TABLE customer_master ADD COLUMN address TEXT`);
    // await db.execute(`ALTER TABLE digi_bill_items ADD COLUMN purchase_price INTEGER DEFAULT 0;`);

console.log("Customer columns updated!");

    console.log("All Platform & Shop tables created successfully!");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

createTables();