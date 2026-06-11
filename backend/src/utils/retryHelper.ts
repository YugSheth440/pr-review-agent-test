/**
 * Retries a given async function with exponential backoff for transient errors (like 503, 429).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isTransient =
      error.status === 503 ||
      error.status === 429 ||
      (error.message &&
        (error.message.includes("503") ||
          error.message.includes("Service Unavailable") ||
          error.message.includes("high demand") ||
          error.message.includes("429") ||
          error.message.includes("Too Many Requests")));

    if (retries > 0 && isTransient) {
      console.warn(`Transient error encountered. Retrying in ${delay}ms... (Retries left: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
