const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

require("./config/passport");
require("./config/googlePassport");
const passport = require("passport");

const authRoutes = require("./routes/auth");
const googleCalendarRoutes = require("./routes/googleCalendar");
const gmailRoutes = require("./routes/gmail");
const githubRoutes = require("./routes/github");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use("/auth", authRoutes);
app.use("/api/google-calendar", googleCalendarRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/github", githubRoutes);

app.get("/", (req, res) => {
  res.send("<h1>Hello from Express!</h1>");
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Server is running",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
