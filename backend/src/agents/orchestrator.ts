import { getPRDiff, postPRComment } from "../github/githubClient.js";
import { parseDiff } from "../utils/diffParser.js";
import { runQualityAgent } from "./qualityAgent.js";
import { runSecurityAgent } from "./securityAgent.js";
import { runDependencyAgent } from "./dependancyAgent.js"; // Note: matches your filename spelling
import { Repository, PullRequest, ScanResult } from "../models/Scemas.js"; // Note: matches Scemas.ts spelling

export async function orchestratePRScan(
    owner: string,
    repoName: string,
    prNumber: number,
    title: string,
    author: string
): Promise<void> {
    console.log(`Starting orchestrator scan for ${owner}/${repoName} #${prNumber}...`);

    try {
        // 1. Fetch Repository and Pull Request records from MongoDB (or create them if they don't exist)
        let dbRepo = await Repository.findOne({ owner, repo: repoName });
        if (!dbRepo) {
            dbRepo = await Repository.create({ owner, repo: repoName, isActive: true });
        }

        let dbPR = await PullRequest.findOne({ prNumber, repository: dbRepo._id });
        if (!dbPR) {
            dbPR = await PullRequest.create({
                prNumber,
                title,
                author,
                state: "open",
                repository: dbRepo._id,
            });
        }

        // 2. Fetch the PR Diff from GitHub
        const rawDiff = await getPRDiff(owner, repoName, prNumber);
        const parsedFiles = parseDiff(rawDiff);

        // 3. Prepare placeholders for findings
        const qualityFindings: any[] = [];
        const securityFindings: any[] = [];
        const dependencyFindings: any[] = [];

        // 4. Run agents in parallel for every modified file
        const scanPromises = parsedFiles.map(async (file) => {
            const [qIssues, sIssues, dIssues] = await Promise.all([
                runQualityAgent(file.filename, file.patches),
                runSecurityAgent(file.filename, file.patches),
                runDependencyAgent(file.filename, file.patches),
            ]);

            qualityFindings.push(...qIssues);
            securityFindings.push(...sIssues);
            dependencyFindings.push(...dIssues);
        });

        await Promise.all(scanPromises);

        console.log(`Scan completed. Quality: ${qualityFindings.length}, Security: ${securityFindings.length}, Dependencies: ${dependencyFindings.length}`);

        // 5. Store Scan Results in MongoDB
        // Save Quality Agent Results
        await ScanResult.create({
            pullRequest: dbPR._id,
            agentName: "quality",
            status: "success",
            findings: qualityFindings.map((f) => ({ ...f, status: "pending_review" })),
        });

        // Save Security Agent Results
        await ScanResult.create({
            pullRequest: dbPR._id,
            agentName: "security",
            status: "success",
            findings: securityFindings.map((f) => ({ ...f, status: "pending_review" })),
        });

        // Save Dependency Agent Results
        await ScanResult.create({
            pullRequest: dbPR._id,
            agentName: "dependency",
            status: "success",
            findings: dependencyFindings.map((f) => ({ ...f, status: "pending_review" })),
        });

        console.log(`Scan results successfully persisted to MongoDB database.`);

        // 6. Format the Markdown Comment for GitHub
        let commentBody = `## 🤖 AI Pull Request Review Report\n\n`;

        if (qualityFindings.length > 0) {
          commentBody += `### 🎨 Code Quality Alerts\n`;
          qualityFindings.forEach((f) => {
            commentBody += `- **${f.file}:L${f.line}** (${f.severity.toUpperCase()}): ${f.comment}\n`;
          });
          commentBody += `\n`;
        } else {
          commentBody += `### 🎨 Code Quality Alerts\n- No quality issues found. Clean work! ✨\n\n`;
        }

        if (securityFindings.length > 0) {
          commentBody += `### 🔒 Security Alerts\n`;
          securityFindings.forEach((f) => {
            commentBody += `- **${f.file}:L${f.line}** 🔴 **${f.severity.toUpperCase()}**: ${f.comment}\n`;
          });
          commentBody += `\n`;
        } else {
          commentBody += `### 🔒 Security Alerts\n- No security vulnerabilities identified. Good job! 🛡️\n\n`;
        }

        if (dependencyFindings.length > 0) {
          commentBody += `### 📦 Dependency Alerts\n`;
          dependencyFindings.forEach((f) => {
            commentBody += `- **${f.file}:L${f.line}** ⚠️ **${f.severity.toUpperCase()}**: ${f.comment}\n`;
          });
          commentBody += `\n`;
        }

        // Post the comment back to the GitHub PR
        await postPRComment(owner, repoName, prNumber, commentBody);
    } catch (error) {
        console.error("Orchestrator pipeline failed:", error);
    }
}
