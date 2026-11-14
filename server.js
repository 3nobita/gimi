const express = require("express");
const session = require("express-session");
const path = require("path");
require("dotenv").config();
const logger = require('./utils/logger');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-key",
    resave: false,
    saveUninitialized: false,

    cookie: {
    maxAge: 60 * 60 * 1000, // 1 Hour
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  }

  })
);

// Set View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
const adminRoutes = require("./routes/adminRoutes");
app.use("/admin", adminRoutes);

const shopRoutes = require("./routes/shopRoutes");
app.use("/shop", shopRoutes);

// Root route redirect to admin login
app.get("/", (req, res) => {
  res.redirect("/admin/login");
});

// --- GLOBAL ERROR HANDLING MIDDLEWARE ---

// 1. 404 Not Found Handler
app.use((req, res, next) => {
    logger.warn(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).render("error", {
        errorCode: "404",
        errorTitle: "Page Not Found",
        errorMessage: "Oops! The page you are looking for does not exist.",
    });
});

// 2. 500 Internal Server Error Handler
app.use((err, req, res, next) => {
    logger.error(`500 Error: ${err.message} - Stack: ${err.stack}`);
    res.status(500).render("error", {
        errorCode: "500",
        errorTitle: "Something Went Wrong",
        errorMessage: "We are facing technical issues. Please try again later.",
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});