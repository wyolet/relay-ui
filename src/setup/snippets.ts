import { INFERENCE_API_URL } from "@/api/client";

/**
 * Placeholders the snippet template leaves for the (rotating) model pointer and
 * prompt. Bare identifiers so sugar-high renders each as a single span we can
 * splice an animated value into — see CodeBlock. {@link snippetLiteral}
 * supplies the quoting.
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

/**
 * `value` as a string literal valid in every snippet language. The curl body
 * sits in shell single quotes, so a `'` there must close, escape, and reopen.
 */
export function snippetLiteral(id: Snippet["id"], value: string): string {
	const json = JSON.stringify(value);
	return id === "curl" ? json.replaceAll("'", "'\\''") : json;
}

/** The copyable snippet with model and prompt filled in as safe literals. */
export function fillSnippet(
	snippet: Snippet,
	model: string,
	message: string,
): string {
	// Function replacers: a string replacement would expand `$'`/`$&` in values.
	return snippet.template
		.replace(MODEL_PLACEHOLDER, () => snippetLiteral(snippet.id, model))
		.replace(MSG_PLACEHOLDER, () => snippetLiteral(snippet.id, message));
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
