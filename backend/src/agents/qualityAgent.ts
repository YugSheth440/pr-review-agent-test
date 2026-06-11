import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { retryWithBackoff } from "../utils/retryHelper.js";

export interface QualityFinding {
  file: string;
  line: number;
  comment: string;
  severity: "low" | "medium";
}

/**
 * Uses Gemini to scan code changes for syntax errors, logic problems, and style issues.
 */
export async function runQualityAgent(filename: string, patches: string): Promise<QualityFinding[]> {
  const aiKey = process.env.GEMINI_API_KEY;
  if (!aiKey) {
    console.warn("GEMINI_API_KEY is not set. Skipping Quality Agent scan.");
    return [];
  }

  const genAI = new GoogleGenerativeAI(aiKey);

  const systemInstruction = `You are a strict, senior code-quality reviewer. 
Review the code changes provided. Focus on code quality issues: logic bugs, bad styling, unused variables, complex structure, or missing error handling.
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
                  line: { type: SchemaType.INTEGER, description: "The line number where the issue occurs" },
                  comment: { type: SchemaType.STRING, description: "Clear explanation of the issue and suggested fix" },
                  severity: { type: SchemaType.STRING, enum: ["low", "medium"], description: "The severity of the issue" }
                },
                required: ["line", "comment", "severity"],
              }
            }
          },
          required: ["findings"]
        } as any // Bypass strict TS schema validation for the enum format constraint
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
    console.error(`Error in Gemini Quality Agent for ${filename}:`, error);
    return [];
  }
}
