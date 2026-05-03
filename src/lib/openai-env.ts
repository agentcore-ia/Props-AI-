export function getOpenAIEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4";

  if (!apiKey) {
    return {
      configured: false as const,
      apiKey: null,
      model,
    };
  }

  return {
    configured: true as const,
    apiKey,
    model,
  };
}
