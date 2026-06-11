import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { retryWithBackoff } from "../utils/retryHelper.js";

export interface DependencyFinding {
    file: string;
    line: number;
    comment: string;
    severity: "medium" | "high";
}

/**
 * Uses Gemini to scan package manifest diff changes for outdated or insecure dependencies.
 */
export async function runDependencyAgent(filename: string, patches: string): Promise<DependencyFinding[]> {
    // Only scan package manifest files
    if (!filename.includes("package.json") && !filename.includes("requirements.txt")) {
        return [];
    }

    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
        console.warn("GEMINI_API_KEY is not set. Skipping Dependency Agent scan.");
        return [];
    }

    const genAI = new GoogleGenerativeAI(aiKey);

    const systemInstruction = `You are a dependency security and licensing auditor.
Analyze the provided package manifest diff. Identify any newly added or updated packages/versions that have widely known critical vulnerabilities (CVEs) or licensing issues (e.g., GPL licenses in a commercial codebase).
You must output a list of findings matching the requested schema.`;

    const prompt = `Manifest File: ${filename}\n\nDiff Content:\n${patches}`;

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        findings: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    line: { type: SchemaType.INTEGER, description: "The line number in package.json/requirements.txt where the dependency is listed" },
                                    comment: { type: SchemaType.STRING, description: "Description of the vulnerability/licensing risk and the recommended safe version to use" },
                                    severity: { type: SchemaType.STRING, enum: ["medium", "high"], description: "Risk level of the dependency alert" }
                                },
                                required: ["line", "comment", "severity"],
                            }
                        }
                    },
                    required: ["findings"]
                } as any
            }
        });

        const result = await retryWithBackoff(() => model.generateContent(prompt));
        const textResponse = result.response.text() || "{}";
        const parsedData = JSON.parse(textResponse);

        return (parsedData.findings || []).map((finding: any) => ({
            file: filename,
            line: finding.line,
            comment: finding.comment,
            severity: finding.severity,
        }));
    } catch (error) {
        console.error(`Error in Gemini Dependency Agent for ${filename}:`, error);
        return [];
    }
}
