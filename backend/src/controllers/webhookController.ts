import { Request, Response } from "express";
import { verify } from "@octokit/webhooks";

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

    console.log(`PR Event Action: ${action} on ${repoOwner}/${repoName} #${prNumber}`);

    if (action === "opened" || action === "synchronize") {
      console.log(`Processing PR #${prNumber} for code review...`);
      // TODO: Async trigger to our Agent Orchestrator will go here
    }
  }

  res.status(202).json({ message: "Webhook payload accepted and processing queued." });
}
