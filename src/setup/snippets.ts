import { CONTROL_API_URL } from "@/api/client";

export interface Snippet {
	id: "curl" | "python" | "node";
	label: string;
	/** Language hint for any future syntax highlighting. */
	lang: string;
	code: string;
}

/**
 * Relay speaks the OpenAI wire format on its data plane, served from the same
 * origin the UI talks to. `CONTROL_API_URL` already resolves to "where relay
 * lives" (env override or window.origin), so the snippets just suffix `/v1`.
 */
export function relayBaseUrl(): string {
	return `${CONTROL_API_URL.replace(/\/$/, "")}/v1`;
}

export function buildSnippets(apiKey: string, model: string): Snippet[] {
	const base = relayBaseUrl();
	return [
		{
			id: "curl",
			label: "curl",
			lang: "bash",
			code: `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{ "role": "user", "content": "Hello from Relay" }]
  }'`,
		},
		{
			id: "python",
			label: "Python",
			lang: "python",
			code: `from openai import OpenAI

client = OpenAI(base_url="${base}", api_key="${apiKey}")

resp = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello from Relay"}],
)
print(resp.choices[0].message.content)`,
		},
		{
			id: "node",
			label: "Node",
			lang: "typescript",
			code: `import OpenAI from "openai";

const client = new OpenAI({ baseURL: "${base}", apiKey: "${apiKey}" });

const resp = await client.chat.completions.create({
  model: "${model}",
  messages: [{ role: "user", content: "Hello from Relay" }],
});
console.log(resp.choices[0].message.content);`,
		},
	];
}
