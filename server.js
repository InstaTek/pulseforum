// server.js
const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

const { db, init } = require("./db");
const { requireAuth, attachUser } = require("./middleware/auth");

init();

const app = express();

// Views
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static + parsing
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

// Sessions (for production: use a real session store + strong secret)
app.use(
  session({
    secret: "replace-this-with-a-long-random-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

// Make user available to templates
app.use(attachUser);

// Helpers
function clampText(s, max = 80) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// HOME: list categories + latest topics
app.get("/", (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM topics t WHERE t.category_id = c.id) AS topic_count
    FROM categories c
    ORDER BY c.name ASC
  `).all();

  const latestTopics = db.prepare(`
    SELECT
      t.id, t.title, t.updated_at, t.pinned,
      c.id AS category_id, c.name AS category_name,
      u.username AS author,
      (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) - 1 AS replies,
      (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS posts_total
    FROM topics t
    JOIN categories c ON c.id = t.category_id
    JOIN users u ON u.id = t.user_id
    ORDER BY t.pinned DESC, t.updated_at DESC
    LIMIT 12
  `).all().map(t => ({
    ...t,
    replies: Math.max(0, t.replies),
    lastLabel: t.updated_at
  }));

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS members,
      (SELECT COUNT(*) FROM topics) AS topics,
      (SELECT COUNT(*) FROM posts) AS posts
  `).get();

  res.render("index", { categories, latestTopics, stats, clampText });
});

// CATEGORIES: list all categories
app.get("/categories", (req, res) => {
  const categories = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM topics t WHERE t.category_id = c.id) AS topic_count
    FROM categories c
    ORDER BY c.name ASC
  `).all();

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS members,
      (SELECT COUNT(*) FROM topics) AS topics,
      (SELECT COUNT(*) FROM posts) AS posts
  `).get();

  res.render("categories", { categories, stats });
});


// CATEGORY: list topics
app.get("/c/:id", (req, res) => {
  const id = Number(req.params.id);
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  if (!category) return res.status(404).send("Category not found");

  const topics = db.prepare(`
    SELECT
      t.id, t.title, t.pinned, t.created_at, t.updated_at,
      u.username AS author,
      (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) - 1 AS replies,
      (SELECT COUNT(*) FROM posts p WHERE p.topic_id = t.id) AS posts_total
    FROM topics t
    JOIN users u ON u.id = t.user_id
    WHERE t.category_id = ?
    ORDER BY t.pinned DESC, t.updated_at DESC
  `).all(id).map(t => ({ ...t, replies: Math.max(0, t.replies) }));

  res.render("category", { category, topics });
});

// NEW TOPIC form
app.get("/c/:id/new", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
  if (!category) return res.status(404).send("Category not found");

  res.render("new-topic", { category, error: null });
});

// CREATE TOPIC (and first post)
app.post("/c/:id/new", requireAuth, (req, res) => {
  const categoryId = Number(req.params.id);
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId);
  if (!category) return res.status(404).send("Category not found");

  const title = (req.body.title || "").trim();
  const content = (req.body.content || "").trim();

  if (title.length < 3 || content.length < 3) {
    return res.render("new-topic", { category, error: "Title and content must be at least 3 characters." });
  }

  const now = new Date().toISOString();

  const insertTopic = db.prepare(`
    INSERT INTO topics (category_id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `);
  const topicInfo = insertTopic.run(categoryId, req.session.user.id, title);

  db.prepare(`
    INSERT INTO posts (topic_id, user_id, content, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(topicInfo.lastInsertRowid, req.session.user.id, content);

  res.redirect(`/t/${topicInfo.lastInsertRowid}`);
});

// THREAD: view topic + posts
app.get("/t/:id", (req, res) => {
  const id = Number(req.params.id);

  const topic = db.prepare(`
    SELECT
      t.*,
      c.id AS category_id, c.name AS category_name,
      u.username AS author
    FROM topics t
    JOIN categories c ON c.id = t.category_id
    JOIN users u ON u.id = t.user_id
    WHERE t.id = ?
  `).get(id);

  if (!topic) return res.status(404).send("Thread not found");

  const posts = db.prepare(`
    SELECT p.*, u.username, u.role
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.topic_id = ?
    ORDER BY p.created_at ASC
  `).all(id);

  res.render("thread", { topic, posts });
});

// REPLY form
app.get("/t/:id/reply", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const topic = db.prepare("SELECT id, title FROM topics WHERE id = ?").get(id);
  if (!topic) return res.status(404).send("Thread not found");

  res.render("reply", { topic, error: null });
});

// REPORT FORM
app.get("/report", (req, res) => {
  res.render("report", {
    error: null,
    values: {
      reporter_name: "",
      contact: "",
      report_type: "ghost",
      subject_choice: "",
      what_sighted: "",
      occurred_at: "",
      location: ""
    }
  });
});

// SUBMIT REPORT
app.post("/report", (req, res) => {
  const reporter_name = (req.body.reporter_name || "").trim();
  const contact = (req.body.contact || "").trim();
  const report_type = (req.body.report_type || "").trim();
  const subject_choice = (req.body.subject_choice || "").trim();
  const what_sighted = (req.body.what_sighted || "").trim();
  const occurred_at = (req.body.occurred_at || "").trim();
  const location = (req.body.location || "").trim();

  // Basic validation (keep it friendly)
  const allowedTypes = new Set(["ghost", "animal", "other"]);
  if (!reporter_name || reporter_name.length < 2) {
    return res.status(400).render("report", {
      error: "Please enter your name (at least 2 characters).",
      values: { reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location }
    });
  }
  if (!allowedTypes.has(report_type)) {
    return res.status(400).render("report", {
      error: "Please choose a valid report type.",
      values: { reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location }
    });
  }
  if (!what_sighted || what_sighted.length < 10) {
    return res.status(400).render("report", {
      error: "Please describe what you saw (at least 10 characters).",
      values: { reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location }
    });
  }
  if (!occurred_at) {
    return res.status(400).render("report", {
      error: "Please provide the date and time of the sighting.",
      values: { reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location }
    });
  }
  if (!location || location.length < 2) {
    return res.status(400).render("report", {
      error: "Please provide a location.",
      values: { reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location }
    });
  }

  db.prepare(`
    INSERT INTO sightings (reporter_name, contact, report_type, subject_choice, what_sighted, occurred_at, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(reporter_name, contact || null, report_type, subject_choice || null, what_sighted, occurred_at, location);

  res.redirect("/reports?submitted=1");
});

// BROWSE REPORTS (optional but scores well)
app.get("/reports", (req, res) => {
  const reports = db.prepare(`
    SELECT id, reporter_name, report_type, subject_choice, location, occurred_at, created_at,
           substr(what_sighted, 1, 180) AS snippet
    FROM sightings
    ORDER BY created_at DESC
    LIMIT 50
  `).all();

  res.render("reports", { reports, submitted: req.query.submitted === "1" });
});


// POST REPLY
app.post("/t/:id/reply", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const topic = db.prepare("SELECT id FROM topics WHERE id = ?").get(id);
  if (!topic) return res.status(404).send("Thread not found");

  const content = (req.body.content || "").trim();
  if (content.length < 2) {
    const topicLite = db.prepare("SELECT id, title FROM topics WHERE id = ?").get(id);
    return res.render("reply", { topic: topicLite, error: "Reply can’t be empty." });
  }

  db.prepare(`
    INSERT INTO posts (topic_id, user_id, content, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(id, req.session.user.id, content);

  db.prepare(`UPDATE topics SET updated_at = datetime('now') WHERE id = ?`).run(id);

  res.redirect(`/t/${id}`);
});

// AUTH: register/login/logout
app.get("/register", (req, res) => res.render("register", { error: null }));
app.post("/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (username.length < 3) return res.render("register", { error: "Username must be at least 3 characters." });
  if (!email.includes("@")) return res.render("register", { error: "Please enter a valid email." });
  if (password.length < 8) return res.render("register", { error: "Password must be at least 8 characters." });

  const exists = db.prepare("SELECT 1 FROM users WHERE username = ? OR email = ?").get(username, email);
  if (exists) return res.render("register", { error: "Username or email already in use." });

  const hash = await bcrypt.hash(password, 12);
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `).run(username, email, hash);

  req.session.user = { id: info.lastInsertRowid, username, role: "member" };
  res.redirect("/");
});

app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.render("login", { error: "Invalid email or password." });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.render("login", { error: "Invalid email or password." });

  req.session.user = { id: user.id, username: user.username, role: user.role };
  res.redirect("/");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// About (optional)
app.get("/about", (req, res) => {
  res.render("index", { // quick: reuse index style or create about.ejs if you want
    categories: [],
    latestTopics: [],
    stats: { members: 0, topics: 0, posts: 0 },
    clampText
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Forum running on http://localhost:${PORT}`);
});
