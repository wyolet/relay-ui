import type { LogPayload } from "@/api/hooks/logs";

/** One normalized turn in a chat/completions transcript. */
export interface ChatMessage {
	/** Stable key for rendering (turn order). */
	id: string;
	role: string;
	content: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null;
}

function parseJson(s: string | undefined): unknown {
	if (!s) return undefined;
	try {
		return JSON.parse(s);
	} catch {
		return undefined;
	}
}

/** Flatten OpenAI content (string | multimodal parts | tool calls) to text. */
function normalizeContent(content: unknown): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.map((part) => {
				if (typeof part === "string") return part;
				if (isRecord(part)) {
					if (part.type === "text" && typeof part.text === "string")
						return part.text;
					if (typeof part.type === "string") return `[${part.type}]`;
				}
				return "";
			})
			.filter(Boolean)
			.join("\n");
	}
	if (isRecord(content)) return JSON.stringify(content);
	return "";
}

function toMessage(m: unknown): ChatMessage | null {
	if (!isRecord(m)) return null;
	const role = typeof m.role === "string" ? m.role : "message";
	let content = normalizeContent(m.content);
	if (!content && Array.isArray(m.tool_calls)) {
		content = m.tool_calls
			.map((t) =>
				isRecord(t) &&
				isRecord(t.function) &&
				typeof t.function.name === "string"
					? `→ ${t.function.name}(…)`
					: "→ tool_call",
			)
			.join("\n");
	}
	return { id: "", role, content };
}

/**
 * Parse a captured request/response payload into a chat transcript. Returns
 * null for non-chat shapes (embeddings, unparseable, or no captured request) —
 * callers fall back to the Raw view. Never throws.
 */
export function parseTranscript(
	payload: LogPayload | undefined,
): ChatMessage[] | null {
	if (!payload) return null;

	const req = parseJson(payload.request_body);
	const messages: ChatMessage[] = [];
	if (isRecord(req) && Array.isArray(req.messages)) {
		for (const m of req.messages) {
			const msg = toMessage(m);
			if (msg) messages.push(msg);
		}
	} else if (isRecord(req) && typeof req.prompt === "string") {
		messages.push({ id: "", role: "prompt", content: req.prompt });
	}

	if (messages.length === 0) return null;

	const res = parseJson(payload.response_body);
	if (isRecord(res) && Array.isArray(res.choices) && res.choices.length > 0) {
		const choice = res.choices[0];
		if (isRecord(choice)) {
			if (isRecord(choice.message)) {
				const msg = toMessage(choice.message);
				if (msg) messages.push(msg);
			} else if (typeof choice.text === "string") {
				messages.push({ id: "", role: "assistant", content: choice.text });
			}
		}
	}

	return messages.map((m, i) => ({ ...m, id: `turn-${i}` }));
}
