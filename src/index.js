import "dotenv/config";
import express from "express";
import cors from "cors";
import { ritualsRouter } from "./routes/rituals.js";
import { eventsRouter } from "./routes/events.js";
import { meRouter } from "./routes/me.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/rituals", ritualsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/me", meRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Rituales API running on port ${PORT}`);
});
