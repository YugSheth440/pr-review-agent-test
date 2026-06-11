export interface ParsedFileDiff {
    filename: string;
    patches: string; // The diff content containing code lines
}

export function parseDiff(diffText: string): ParsedFileDiff[] {
    const files: ParsedFileDiff[] = [];

    // Split the diff text by file headers
    const fileDiffs = diffText.split("diff --git");

    for (const fileDiff of fileDiffs) {
        if (!fileDiff.trim()) continue;

        const lines = fileDiff.split("\n");

        // Find the file path (e.g. b/src/app.ts)
        const headerLine = lines[0] || "";
        const match = headerLine.match(/b\/(.+)$/);
        if (!match) continue;

        const filename = match[1]!;

        // Ignore configuration lockfiles to keep our AI agent checks focused
        if (
            filename.endsWith(".lock") ||
            filename.includes("package-lock.json") ||
            filename.includes("yarn.lock")
        ) {
            continue;
        }

        // Capture the code additions and contextual lines
        const patchContent = lines
            .filter(line => line.startsWith("@@") || line.startsWith("+") || line.startsWith(" "))
            .join("\n");

        files.push({
            filename,
            patches: patchContent,
        });
    }

    return files;
}
