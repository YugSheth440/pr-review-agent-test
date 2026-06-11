import dotenv from "dotenv";
dotenv.config();
import { Octokit } from "@octokit/rest";

async function testGitHubToken() {
  const token = process.env.GITHUB_APP_TOKEN;
  console.log("Token starts with:", token ? token.substring(0, 12) + "..." : "undefined");
  
  const octokit = new Octokit({
    auth: token,
  });

  try {
    const { data } = await octokit.users.getAuthenticated();
    console.log("Token is valid! Authenticated as:", data.login);
  } catch (error: any) {
    console.error("Authentication failed:", error.message);
    if (error.status) {
      console.error("Status:", error.status);
    }
  }
}

testGitHubToken();
