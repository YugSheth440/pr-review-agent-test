import express from "express";
import cors from "cors";
import { handleWebhook } from "./controllers/webhookController";

const app = express();

app.use(cors());
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "PR Review Agent API" });
});

// GitHub webhook route
app.post("/api/webhooks/github", handleWebhook);

export default app;
