import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection pool
let pool: any;
let useMockData = false;

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "Clientportaladmin",
  password: process.env.DB_PASSWORD || "Meubilex123!",
  database: process.env.DB_NAME || "ClientportalV2",
  port: parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// In-memory store for fallback mode
const mockStore: any = {
  projects: [],
  users: [],
  master_packages: [],
  messages: [],
  portal_documents: []
};

async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    // Test connection
    const connection = await pool.getConnection();
    console.log("✅ Database connected successfully");
    connection.release();
  } catch (error) {
    console.error("⚠️ Database connection failed. Falling back to Mock Mode.");
    console.error("Reason:", (error as Error).message);
    useMockData = true;
  }
}

// Helper to handle JSON fields
const parseJsonFields = (obj: any, fields: string[]) => {
  if (!obj) return obj;
  const newObj = { ...obj };
  fields.forEach(field => {
    if (newObj[field] && typeof newObj[field] === 'string') {
      try {
        newObj[field] = JSON.parse(newObj[field]);
      } catch (e) {
        newObj[field] = [];
      }
    }
  });
  return newObj;
};

// API Routes
app.get("/api/projects", async (req, res) => {
  try {
    if (useMockData) return res.json(mockStore.projects);
    const [rows] = await pool.query("SELECT * FROM projects");
    const projects = (rows as any[]).map(p => parseJsonFields(p, ['available_option_ids', 'additional_photos']));
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const p = req.body;
    if (useMockData) {
      const index = mockStore.projects.findIndex((existing: any) => existing.id === p.id);
      if (index >= 0) mockStore.projects[index] = p;
      else mockStore.projects.push(p);
      return res.json({ success: true });
    }
    await pool.query(
      "INSERT INTO projects (id, name, status, address, homes_count, postal_code, city, manager, available_option_ids, additional_photos, internal_remarks, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [p.id, p.name, p.status, p.address, p.homes_count, p.postal_code, p.city, p.manager, JSON.stringify(p.available_option_ids || []), JSON.stringify(p.additional_photos || []), p.internal_remarks, p.delivery_date]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    if (useMockData) return res.json(mockStore.users);
    const [rows] = await pool.query("SELECT * FROM users");
    const users = (rows as any[]).map(u => parseJsonFields(u, ['apartment_details', 'construction_progress', 'exceptions']));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/users/upsert", async (req, res) => {
  try {
    const users = req.body;
    if (useMockData) {
      users.forEach((u: any) => {
        const index = mockStore.users.findIndex((existing: any) => existing.id === u.id);
        if (index >= 0) mockStore.users[index] = u;
        else mockStore.users.push(u);
      });
      return res.json({ success: true });
    }
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id, email, name, role, password, is_active, is_password_set, project_id, apartment_id, master_package_id, apartment_details, construction_progress, created_at, remarks, exceptions) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         email=VALUES(email), name=VALUES(name), role=VALUES(role), password=VALUES(password), is_active=VALUES(is_active), 
         is_password_set=VALUES(is_password_set), project_id=VALUES(project_id), apartment_id=VALUES(apartment_id), 
         master_package_id=VALUES(master_package_id), apartment_details=VALUES(apartment_details), 
         construction_progress=VALUES(construction_progress), remarks=VALUES(remarks), exceptions=VALUES(exceptions)`,
        [u.id, u.email, u.name, u.role, u.password, u.is_active, u.is_password_set, u.project_id, u.apartment_id, u.master_package_id, JSON.stringify(u.apartment_details || {}), JSON.stringify(u.construction_progress || {}), u.created_at, u.remarks, JSON.stringify(u.exceptions || [])]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/master_packages", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (useMockData) {
      return res.json(projectId ? mockStore.master_packages.filter((p: any) => p.project_id === projectId) : mockStore.master_packages);
    }
    let sql = "SELECT * FROM master_packages";
    let params: any[] = [];
    if (projectId) {
      sql += " WHERE project_id = ?";
      params.push(projectId);
    }
    const [rows] = await pool.query(sql, params);
    const packages = (rows as any[]).map(p => parseJsonFields(p, ['inclusions', 'photos', 'option_ids']));
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/master_packages", async (req, res) => {
  try {
    const mp = req.body;
    if (useMockData) {
      const index = mockStore.master_packages.findIndex((existing: any) => existing.id === mp.id);
      if (index >= 0) mockStore.master_packages[index] = mp;
      else mockStore.master_packages.push(mp);
      return res.json({ success: true });
    }
    await pool.query(
      "INSERT INTO master_packages (id, name, project_id, price, category, inclusions, photos, option_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [mp.id, mp.name, mp.project_id, mp.price, mp.category, JSON.stringify(mp.inclusions || []), JSON.stringify(mp.photos || []), JSON.stringify(mp.option_ids || [])]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/messages", async (req, res) => {
  try {
    const { customerId } = req.query;
    if (useMockData) {
      return res.json(customerId ? mockStore.messages.filter((m: any) => m.customer_id === customerId) : mockStore.messages);
    }
    let sql = "SELECT * FROM messages";
    let params: any[] = [];
    if (customerId) {
      sql += " WHERE customer_id = ?";
      params.push(customerId);
    }
    sql += " ORDER BY date ASC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const m = req.body;
    if (useMockData) {
      mockStore.messages.push(m);
      return res.json({ success: true });
    }
    await pool.query(
      "INSERT INTO messages (id, project_id, customer_id, sender_id, sender_name, role, text, date, category, is_escalated, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [m.id, m.project_id, m.customer_id, m.sender_id, m.sender_name, m.role, m.text, m.date, m.category, m.is_escalated, m.is_archived]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get("/api/documents", async (req, res) => {
  try {
    const { customerId } = req.query;
    if (useMockData) {
      return res.json(mockStore.portal_documents.filter((d: any) => d.customer_id === customerId));
    }
    const [rows] = await pool.query("SELECT * FROM portal_documents WHERE customer_id = ?", [customerId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/documents", async (req, res) => {
  try {
    const d = req.body;
    if (useMockData) {
      mockStore.portal_documents.push(d);
      return res.json({ success: true });
    }
    await pool.query(
      "INSERT INTO portal_documents (id, project_id, customer_id, file_name, uploaded_by, role, date, size, external_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [d.id, d.project_id, d.customer_id, d.file_name, d.uploaded_by, d.role, d.date, d.size, d.external_url]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Vite middleware for development
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
