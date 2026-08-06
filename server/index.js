import express from "express";
import cors from "cors";
import { initDB, loadFullState, saveFullState } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/estado", (_req, res) => {
  try {
    const data = loadFullState();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/estado", (req, res) => {
  try {
    saveFullState(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

initDB();
app.listen(PORT, () => {
  console.log(`Lunaris API en http://localhost:${PORT}`);
  console.log("Base de datos relacional SQLite activa.");
});
