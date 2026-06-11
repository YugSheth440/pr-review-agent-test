import dotenv from "dotenv";
dotenv.config();

async function checkApiKey() {
    const key = process.env.GEMINI_API_KEY || "";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        const response = await fetch(url);
        const data: any = await response.json();

        if (response.ok) {
            console.log("=== API KEY IS VALID ===");
            console.log("Available models:");
            data.models.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
            console.error("=== API KEY ERROR ===");
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("HTTP Request failed:", error);
    }
}

checkApiKey();
