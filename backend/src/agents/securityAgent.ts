import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { retryWithBackoff } from "../utils/retryHelper.js";

export interface SecurityFinding {
    file: string;
    line: number;
    comment: string;
    severity: "high" | "critical";
}

/**
 * Uses Gemini to scan code changes for security vulnerabilities (OWASP Top 10).
 */
export async function runSecurityAgent(filename: string, patches: string): Promise<SecurityFinding[]> {
    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
        console.warn("GEMINI_API_KEY is not set. Skipping Security Agent scan.");
        return [];
    }

    const genAI = new GoogleGenerativeAI(aiKey);

    const systemInstruction = `You are an expert security auditor. 
Analyze the provided code changes strictly for security vulnerabilities (e.g., SQL Injection, Cross-Site Scripting (XSS), CSRF, hardcoded API keys/secrets, path traversal, or weak encryption).
Ignore stylistic issues. 
You must output a list of findings matching the requested schema.`;

    const prompt = `File to review: ${filename}\n\nDiff patches:\n${patches}`;

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
                                    line: { type: SchemaType.INTEGER, description: "The line number where the security vulnerability is found" },
                                    comment: { type: SchemaType.STRING, description: "Detailed description of the security vulnerability and how to patch/remediate it" },
                                    severity: { type: SchemaType.STRING, enum: ["high", "critical"], description: "The risk level of the vulnerability" }
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
        console.error(`Error in Gemini Security Agent for ${filename}:`, error);
        return [];
    }
}
