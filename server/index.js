import express from "express";
import cors from "cors";
import { initDB, getEstado, saveEstado } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/estado", async (_req, res) => {
  try {
    const data = await getEstado();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/estado", async (req, res) => {
  try {
    await saveEstado(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Lunaris API en http://localhost:${PORT}`);
  });
});
