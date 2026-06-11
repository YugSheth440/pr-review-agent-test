import React, { useState, useEffect } from "react";
import {
  GitPullRequest,
  Database,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderGit2,
  ArrowLeft,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  EyeOff
} from "lucide-react";

const BACKEND_URL = "http://localhost:5000";

interface Repository {
  _id: string;
  owner: string;
  repo: string;
  isActive: boolean;
}

interface PullRequest {
  _id: string;
  prNumber: number;
  title: string;
  author: string;
  state: "open" | "closed";
  repository: Repository;
  totalFindings: number;
  pendingReviewCount: number;
  agentStatus: Record<string, "pending" | "success" | "failed">;
  createdAt: string;
}

interface Finding {
  _id: string;
  file: string;
  line: number;
  severity: "low" | "medium" | "high" | "critical";
  comment: string;
  status: "pending_review" | "approved" | "dismissed";
}

interface ScanResult {
  _id: string;
  agentName: "quality" | "security" | "dependency";
  status: "pending" | "success" | "failed";
  findings: Finding[];
}

interface PRDetailResponse {
  pullRequest: PullRequest;
  scans: ScanResult[];
}

export default function App() {
  const [view, setView] = useState<"dashboard" | "detail">("dashboard");
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PRDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch all scanned PRs
  const fetchPullRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/pull-requests`);
      const data = await res.json();
      setPullRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading PRs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPullRequests();
  }, []);

  // Fetch details of a selected PR
  const handleSelectPR = async (prId: string) => {
    try {
      setDetailLoading(true);
      setView("detail");
      const res = await fetch(`${BACKEND_URL}/api/pull-requests/${prId}`);
      const data = await res.json();
      setSelectedPR(data);
    } catch (err) {
      console.error("Error loading PR details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Update a finding's status
  const handleUpdateFindingStatus = async (scanId: string, findingId: string, newStatus: "approved" | "dismissed") => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/scans/${scanId}/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // Optimistically update the UI state
        if (selectedPR) {
          const updatedScans = selectedPR.scans.map(scan => {
            if (scan._id === scanId) {
              return {
                ...scan,
                findings: scan.findings.map(finding => {
                  if (finding._id === findingId) {
                    return { ...finding, status: newStatus };
                  }
                  return finding;
                })
              };
            }
            return scan;
          });
          setSelectedPR({ ...selectedPR, scans: updatedScans });
        }
      }
    } catch (err) {
      console.error("Error updating finding status:", err);
    }
  };

  // Calculate dashboard stats
  const totalScans = pullRequests.length;
  const pendingReviews = pullRequests.reduce((acc, pr) => acc + pr.pendingReviewCount, 0);
  const activeRepos = new Set(pullRequests.map(pr => pr.repository?.repo)).size;

  return (
    <div className="min-h-screen text-slate-100 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
            <GitPullRequest className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PR Review Agent <span className="text-xs font-semibold px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30">Admin</span>
            </h1>
            <p className="text-xs text-slate-400">Agentic quality, security, and manifest analysis reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Server Online
          </span>
        </div>
      </header>

      {view === "dashboard" ? (
        /* ================= DASHBOARD VIEW ================= */
        <div>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel p-6 flex items-center justify-between interactive-card">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total PRs Scanned</p>
                <h3 className="text-3xl font-extrabold text-white">{totalScans}</h3>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400">
                <Database className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center justify-between interactive-card">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Open Warnings</p>
                <h3 className="text-3xl font-extrabold text-amber-400">{pendingReviews}</h3>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center justify-between interactive-card">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Active Repositories</p>
                <h3 className="text-3xl font-extrabold text-violet-400">{activeRepos}</h3>
              </div>
              <div className="bg-violet-500/10 p-3 rounded-lg text-violet-400">
                <FolderGit2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Scanned PRs Table */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-400" />
              Pull Request Scan History
            </h2>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              </div>
            ) : pullRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No PR scans found in the database. Open a pull request in your GitHub repository to trigger the agent.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4">Pull Request</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4">Quality Agent</th>
                      <th className="py-3.5 px-4">Security Agent</th>
                      <th className="py-3.5 px-4">Dependency Agent</th>
                      <th className="py-3.5 px-4">Pending Review</th>
                      <th className="py-3.5 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {pullRequests.map((pr) => (
                      <tr key={pr._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-200 text-sm max-w-xs truncate">{pr.title}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>{pr.repository?.owner}/{pr.repository?.repo}</span>
                            <span className="text-slate-600">•</span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">#{pr.prNumber}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300">
                          @{pr.author}
                        </td>
                        <td className="py-4 px-4">
                          {renderStatusBadge(pr.agentStatus?.quality)}
                        </td>
                        <td className="py-4 px-4">
                          {renderStatusBadge(pr.agentStatus?.security)}
                        </td>
                        <td className="py-4 px-4">
                          {renderStatusBadge(pr.agentStatus?.dependency)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.pendingReviewCount > 0
                              ? "bg-amber-400/15 text-amber-400 border border-amber-400/20"
                              : "bg-emerald-400/15 text-emerald-400 border border-emerald-400/20"
                            }`}>
                            {pr.pendingReviewCount} issues
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleSelectPR(pr._id)}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all"
                          >
                            Review
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= PR DETAILS VIEW ================= */
        <div>
          {/* Back button */}
          <button
            onClick={() => { setView("dashboard"); setSelectedPR(null); }}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          {detailLoading || !selectedPR ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: PR Information & Scans summary */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-panel p-6">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-violet-600/20 text-violet-400 rounded-full border border-violet-600/30">
                    PR Scan Details
                  </span>
                  <h2 className="text-xl font-bold text-white mt-3 mb-1">{selectedPR.pullRequest.title}</h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Opened by @{selectedPR.pullRequest.author} on {selectedPR.pullRequest.repository?.owner}/{selectedPR.pullRequest.repository?.repo}
                  </p>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">PR Number</span>
                      <span className="text-slate-200 font-semibold">#{selectedPR.pullRequest.prNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Status</span>
                      <span className="text-slate-200 font-semibold capitalize">{selectedPR.pullRequest.state}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Scan date</span>
                      <span className="text-slate-200 text-xs">
                        {new Date(selectedPR.pullRequest.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 mt-4">
                    <a
                      href={`https://github.com/${selectedPR.pullRequest.repository.owner}/${selectedPR.pullRequest.repository.repo}/pull/${selectedPR.pullRequest.prNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      View on GitHub
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Scan Status details */}
                <div className="glass-panel p-6">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Scan Agents Health</h3>
                  <div className="space-y-3.5">
                    {selectedPR.scans.map((scan) => (
                      <div key={scan._id} className="flex justify-between items-center bg-slate-800/30 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-xs font-semibold capitalize text-slate-300">
                          {scan.agentName} Agent
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">({scan.findings.length} alerts)</span>
                          {renderStatusBadge(scan.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: List of Agent Findings */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-semibold text-white mb-6">Review Findings</h3>

                  {getFindingsCount(selectedPR.scans) === 0 ? (
                    <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="h-12 w-12 text-emerald-400/80" />
                      <p className="font-semibold text-slate-300">No vulnerabilities or quality alerts found!</p>
                      <p className="text-xs text-slate-500">All scanned files look healthy.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {selectedPR.scans.map((scan) => (
                        <div key={scan._id}>
                          {scan.findings.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                                <span className="capitalize">{scan.agentName} Alerts</span>
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-[10px]">
                                  {scan.findings.length} total
                                </span>
                              </h4>
                              {scan.findings.map((finding) => (
                                <div
                                  key={finding._id}
                                  className={`p-4 rounded-xl border transition-all ${finding.status === "dismissed"
                                      ? "bg-slate-900/40 border-slate-800/80 opacity-60"
                                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                                    }`}
                                >
                                  {/* Finding Top Row */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getSeverityColor(finding.severity)}`}>
                                        {finding.severity}
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono">
                                        {finding.file}:L{finding.line}
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleUpdateFindingStatus(scan._id, finding._id, "approved")}
                                        disabled={finding.status === "approved"}
                                        className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${finding.status === "approved"
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                          }`}
                                        title="Approve finding suggestion"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                        {finding.status === "approved" && <span className="text-[10px]">Approved</span>}
                                      </button>
                                      <button
                                        onClick={() => handleUpdateFindingStatus(scan._id, finding._id, "dismissed")}
                                        disabled={finding.status === "dismissed"}
                                        className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${finding.status === "dismissed"
                                            ? "bg-slate-800 text-slate-500"
                                            : "text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                                          }`}
                                        title="Dismiss warning"
                                      >
                                        <EyeOff className="h-3.5 w-3.5" />
                                        {finding.status === "dismissed" && <span className="text-[10px]">Dismissed</span>}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Finding Comment */}
                                  <p className="text-sm text-slate-300 leading-relaxed font-sans mt-2">
                                    {finding.comment}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helpers
function renderStatusBadge(status?: "pending" | "success" | "failed") {
  if (status === "success") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
        <Clock className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full border border-rose-400/20">
        <ShieldAlert className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return <span className="text-[11px] text-slate-500">Not Scanned</span>;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
    case "medium":
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    default:
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  }
}

function getFindingsCount(scans: ScanResult[]): number {
  return scans.reduce((acc, scan) => acc + (scan.findings?.length || 0), 0);
}
