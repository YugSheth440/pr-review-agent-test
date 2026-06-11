import { Request, Response } from "express";
import { verify } from "@octokit/webhooks-methods";
import { orchestratePRScan } from "../agents/orchestrator.js";

interface AuthenticatedRequest extends Request {
  rawBody?: string;
}

export async function handleWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const signature = req.headers["x-hub-signature-256"] as string;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  // 1. Signature Verification
  if (!signature) {
    res.status(401).json({ error: "Missing x-hub-signature-256 header" });
    return;
  }

  if (!webhookSecret) {
    console.warn("WEBHOOK_SECRET is not configured. Skipping signature verification in development.");
  } else {
    const rawBody = req.rawBody || "";
    const isValid = await verify(webhookSecret, rawBody, signature);
    if (!isValid) {
      res.status(401).json({ error: "Invalid signature verification" });
      return;
    }
  }

  // 2. Identify Event Type
  const event = req.headers["x-github-event"];
  const payload = req.body;

  console.log(`Received GitHub event: ${event}`);

  if (event === "pull_request") {
    const action = payload.action;
    const prNumber = payload.number;
    const repoName = payload.repository.name;
    const repoOwner = payload.repository.owner.login;
    const prTitle = payload.pull_request.title;
    const prAuthor = payload.pull_request.user.login;

    console.log(`PR Event Action: ${action} on ${repoOwner}/${repoName} #${prNumber}`);

    if (action === "opened" || action === "synchronize") {
      // Trigger the multi-agent orchestration pipeline asynchronously
      orchestratePRScan(repoOwner, repoName, prNumber, prTitle, prAuthor)
        .then(() => {
          console.log(`Successfully completed PR #${prNumber} scan and saved to database.`);
        })
        .catch((err) => {
          console.error(`Orchestration failed for PR #${prNumber}:`, err);
        });
    }
  }

  res.status(202).json({ message: "Webhook payload accepted and processing queued." });
}
