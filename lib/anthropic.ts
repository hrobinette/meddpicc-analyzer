import Anthropic from "@anthropic-ai/sdk";

// Single shared client. The API key lives only on the server, read from the
// environment — it is never sent to the browser. Importing this module from any
// client component would leak it, so keep it server-only.
if (!process.env.ANTHROPIC_API_KEY) {
  // Don't throw at import time in dev tooling; the route surfaces a clean error.
  // This console hint just speeds up debugging a missing key.
  console.warn(
    "[anthropic] ANTHROPIC_API_KEY is not set — /api/analyze will return 500 until it is.",
  );
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
