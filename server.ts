import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- JOUW DATABASE CONFIGURATIE ----
const dbConfig = {
  host: "195.201.82.4",
  user: "Whoon",
  password: "Zu!fqe22pS6Pk_zd",
  database: "PortalWH",
  port: 3306,
};

let pool: mysql.Pool;

async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log("✅ Verbonden met PortalWH op 195.201.82.4");
  } catch (error) {
    console.error("❌ DB Fout:", error);
  }
}

// --- GEMINI AI CONFIGURATIE ---
const genAI = new GoogleGenerativeAI("AIzaSyCkipSiYQzxVxb9TBKix3UhM5LVemBlpIk");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// API voor de AI assistent
app.post("/api/chat/ai", async (req, res) => {
  const { message } = req.body;
  const result = await model.generateContent(message);
  res.json({ text: result.response.text() });
});

// Basis routes voor je portaal
app.get("/api/projects", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM projects");
  res.json(rows);
});

async function startServer() {
  await initDb();
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => console.log(`🚀 Server up op poort ${PORT}`));
}

startServer();