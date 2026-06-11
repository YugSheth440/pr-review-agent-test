import express from "express";
import cors from "cors";
import { handleWebhook } from "./controllers/webhookController.js";
import { getRepositories, getPullRequests, getPullRequestDetails, updateFindingStatus } from "./controllers/dashboardController.js";

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

// Dashboard API routes
app.get("/api/repositories", getRepositories);
app.get("/api/pull-requests", getPullRequests);
app.get("/api/pull-requests/:id", getPullRequestDetails);
app.patch("/api/scans/:scanId/findings/:findingId", updateFindingStatus);

export default app;
