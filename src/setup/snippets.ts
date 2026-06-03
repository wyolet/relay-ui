import { INFERENCE_API_URL } from "@/api/client";

/**
 * Placeholders the snippet template leaves for the (rotating) model pointer and
 * prompt. Bare identifiers so sugar-high renders each as a single span we can
 * splice an animated value into — see CodeBlock. The renderer supplies the
 * surrounding quotes.
 */
export const MODEL_PLACEHOLDER = "RELAYMODEL";
export const MSG_PLACEHOLDER = "RELAYMSG";

export interface Snippet {
	id: "curl" | "python" | "node";
	label: string;
	/** Language hint for any future syntax highlighting. */
	lang: string;
	/** Code with {@link MODEL_PLACEHOLDER}/{@link MSG_PLACEHOLDER} to fill in. */
	template: string;
}

/**
 * Base URL a client points at. Relay serves each provider's wire format from
 * its **data plane** under that provider's adapter, so the path is
 * `/{adapter}/v1` — e.g. `/openai/v1`, `/anthropic/v1`. NOT `/v1` (that 404s),
 * and NOT the control API origin. The adapter comes from the model's binding.
 * See {@link INFERENCE_API_URL}.
 */
export function relayBaseUrl(adapter: string): string {
	return `${INFERENCE_API_URL.replace(/\/$/, "")}/${adapter}/v1`;
}

export function buildSnippets(apiKey: string, adapter: string): Snippet[] {
	const base = relayBaseUrl(adapter);
	const m = MODEL_PLACEHOLDER;
	const c = MSG_PLACEHOLDER;
	return [
		{
			id: "curl",
			label: "curl",
			lang: "bash",
			template: `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": ${m},
    "messages": [{ "content": ${c}, "role": "user" }]
  }'`,
		},
		{
			id: "python",
			label: "Python",
			lang: "python",
			template: `from openai import OpenAI

client = OpenAI(base_url="${base}", api_key="${apiKey}")

resp = client.chat.completions.create(
    model=${m},
    messages=[{"content": ${c}, "role": "user"}],
)
print(resp.choices[0].message.content)`,
		},
		{
			id: "node",
			label: "Node",
			lang: "typescript",
			template: `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${base}", apiKey: "${apiKey}" });

const resp = await client.chat.completions.create({
  model: ${m},
  messages: [{ content: ${c}, role: "user" }],
});
console.log(resp.choices[0].message.content);`,
		},
	];
}
