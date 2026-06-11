import { Schema, model, Document, Types } from "mongoose";

// 1. Repository Interface & Schema
export interface IRepository extends Document {
  owner: string;
  repo: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>(
  {
    owner: { type: String, required: true },
    repo: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 2. PullRequest Interface & Schema
export interface IPullRequest extends Document {
  prNumber: number;
  title: string;
  author: string;
  state: "open" | "closed";
  repository: Types.ObjectId; // Fixed: Use Types.ObjectId instead of Schema.Types.ObjectId
  createdAt: Date;
  updatedAt: Date;
}

const PullRequestSchema = new Schema<IPullRequest>(
  {
    prNumber: { type: Number, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    state: { type: String, enum: ["open", "closed"], default: "open" },
    repository: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
  },
  { timestamps: true }
);

// Define compound index to avoid duplicate PRs within a repo
PullRequestSchema.index({ prNumber: 1, repository: 1 }, { unique: true });

// 3. ScanResult Interface & Schema
export interface IFinding {
  file: string;
  line: number;
  severity: "low" | "medium" | "high" | "critical";
  comment: string;
  patchSnippet?: string;
  status: "pending_review" | "approved" | "dismissed";
}

export interface IScanResult extends Document {
  pullRequest: Types.ObjectId; // Fixed: Use Types.ObjectId instead of Schema.Types.ObjectId
  agentName: "quality" | "security" | "dependency";
  status: "pending" | "success" | "failed";
  findings: IFinding[];
  createdAt: Date;
  updatedAt: Date;
}

const FindingSchema = new Schema<IFinding>({
  file: { type: String, required: true },
  line: { type: Number, required: true },
  severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  comment: { type: String, required: true },
  patchSnippet: { type: String },
  status: { type: String, enum: ["pending_review", "approved", "dismissed"], default: "pending_review" },
});

const ScanResultSchema = new Schema<IScanResult>(
  {
    pullRequest: { type: Schema.Types.ObjectId, ref: "PullRequest", required: true },
    agentName: { type: String, enum: ["quality", "security", "dependency"], required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    findings: [FindingSchema],
  },
  { timestamps: true }
);

export const Repository = model<IRepository>("Repository", RepositorySchema);
export const PullRequest = model<IPullRequest>("PullRequest", PullRequestSchema);
export const ScanResult = model<IScanResult>("ScanResult", ScanResultSchema);
