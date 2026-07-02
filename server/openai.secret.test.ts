import { describe, expect, it } from "vitest";

describe("OpenAI secret configuration", () => {
  it("accepts the configured OPENAI_API_KEY against the OpenAI models endpoint", async () => {
    const apiKey = process.env.OPENAI_API_KEY;

    expect(apiKey, "OPENAI_API_KEY must be configured for GPT image editing").toBeTruthy();

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const bodyText = await response.text();

    expect(
      response.ok,
      `Expected OpenAI API key to be valid, received ${response.status}: ${bodyText}`,
    ).toBe(true);
  }, 15000);
});
