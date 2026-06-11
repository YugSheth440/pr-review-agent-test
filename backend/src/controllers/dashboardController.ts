import { Request, Response } from "express";
import { Repository, PullRequest, ScanResult } from "../models/Scemas.js";

// 1. Get all repositories
export async function getRepositories(req: Request, res: Response): Promise<void> {
    try {
        const repos = await Repository.find().sort({ updatedAt: -1 });
        res.status(200).json(repos);
    } catch (error: any) {
        console.error("Error fetching repositories:", error);
        res.status(500).json({ error: error.message });
    }
}

// 2. Get all Pull Requests (with repository details & scan summary)
export async function getPullRequests(req: Request, res: Response): Promise<void> {
    try {
        const prs = await PullRequest.find().populate("repository").sort({ updatedAt: -1 });

        // Enrich each PR with its total findings and scan statuses
        const enrichedPRs = await Promise.all(
            prs.map(async (pr) => {
                const scans = await ScanResult.find({ pullRequest: pr._id });

                let totalFindings = 0;
                let pendingReviewCount = 0;
                const agentStatus: Record<string, string> = {};

                scans.forEach((scan) => {
                    agentStatus[scan.agentName] = scan.status;
                    if (scan.status === "success" && scan.findings) {
                        totalFindings += scan.findings.length;
                        pendingReviewCount += scan.findings.filter(f => f.status === "pending_review").length;
                    }
                });

                return {
                    ...pr.toObject(),
                    totalFindings,
                    pendingReviewCount,
                    agentStatus,
                };
            })
        );

        res.status(200).json(enrichedPRs);
    } catch (error: any) {
        console.error("Error fetching Pull Requests:", error);
        res.status(500).json({ error: error.message });
    }
}

// 3. Get specific PR Details and all its associated Scan Findings
export async function getPullRequestDetails(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const pr = await PullRequest.findById(id).populate("repository");
        if (!pr) {
            res.status(404).json({ error: "Pull Request not found" });
            return;
        }

        const scans = await ScanResult.find({ pullRequest: pr._id });

        res.status(200).json({
            pullRequest: pr,
            scans,
        });
    } catch (error: any) {
        console.error("Error fetching PR details:", error);
        res.status(500).json({ error: error.message });
    }
}

// 4. Update the status of a specific finding (e.g. approve or dismiss a code smell)
export async function updateFindingStatus(req: Request, res: Response): Promise<void> {
    try {
        const { scanId, findingId } = req.params;
        const { status } = req.body; // expected: 'pending_review' | 'approved' | 'dismissed'

        if (!["pending_review", "approved", "dismissed"].includes(status)) {
            res.status(400).json({ error: "Invalid status value" });
            return;
        }

        const scan = await ScanResult.findById(scanId);
        if (!scan) {
            res.status(404).json({ error: "Scan result not found" });
            return;
        }

        // Find the specific finding in the sub-document array
        const finding = scan.findings.find((f: any) => f._id.toString() === findingId);
        if (!finding) {
            res.status(404).json({ error: "Finding not found" });
            return;
        }

        finding.status = status;
        await scan.save();

        res.status(200).json({ message: "Finding status updated successfully", finding });
    } catch (error: any) {
        console.error("Error updating finding status:", error);
        res.status(500).json({ error: error.message });
    }
}
