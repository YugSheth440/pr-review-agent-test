import { Octokit } from "@octokit/rest";

// Helper function to create an Octokit instance dynamically on demand
function getOctokitInstance(): Octokit {
  const token = process.env.GITHUB_APP_TOKEN;
  if (!token) {
    console.warn("GITHUB_APP_TOKEN is not set in environment variables.");
  }
  return new Octokit({
    auth: token,
  });
}

/**
 * Fetches the raw code diff (changes) for a specific pull request
 */
export async function getPRDiff(owner: string, repo: string, pullNumber: number): Promise<string> {
  const octokit = getOctokitInstance();
  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: "application/vnd.github.v3.diff", // Enforces fetching raw diff text instead of JSON metadata
      },
    });

    return data as unknown as string;
  } catch (error) {
    console.error("Error fetching PR diff from GitHub:", error);
    throw error;
  }
}

/**
 * Posts a consolidated review comment to a pull request
 */
export async function postPRComment(
  owner: string,
  repo: string,
  pullNumber: number,
  commentBody: string
): Promise<void> {
  const octokit = getOctokitInstance();
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: commentBody,
    });
    console.log(`Successfully posted consolidated review comment to PR #${pullNumber}.`);
  } catch (error) {
    console.error("Error posting comment to PR:", error);
    throw error;
  }
}
