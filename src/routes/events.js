import { Router } from "express";
import { supabase } from "../lib/supabase.js";

export const eventsRouter = Router();

// POST /api/events
eventsRouter.post("/", async (req, res, next) => {
  try {
    const { event, ts, ...props } = req.body;
    if (!event) return res.status(400).json({ error: "Missing event name." });

    await supabase.from("events").insert({
      event,
      ts: ts ? new Date(ts).toISOString() : new Date().toISOString(),
      props,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
