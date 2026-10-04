import { describe, expect, it } from "bun:test";
import { buildSnippets, fillSnippet, snippetLiteral } from "./snippets";

const hostile = `x'; touch /tmp/pwned; echo '$'$&"`;

function snippet(id: "curl" | "python" | "node") {
	const s = buildSnippets("sk-test", "openai").find((x) => x.id === id);
	if (!s) throw new Error(`no ${id} snippet`);
	return s;
}

describe("snippetLiteral", () => {
	it("emits a JSON string literal for code snippets", () => {
		expect(snippetLiteral("python", hostile)).toBe(JSON.stringify(hostile));
		expect(snippetLiteral("node", hostile)).toBe(JSON.stringify(hostile));
	});

	it("keeps the curl body inside its shell single quotes", () => {
		const literal = snippetLiteral("curl", hostile);
		// Every `'` is the close-escape-reopen sequence; none ends the quote bare.
		expect(literal.replaceAll("'\\''", "")).not.toContain("'");
	});
});

describe("fillSnippet", () => {
	it("does not expand replacement patterns in values", () => {
		const filled = fillSnippet(snippet("node"), "m$'", "p$&");
		expect(filled).toContain('model: "m$\'"');
		expect(filled).toContain('content: "p$&"');
	});

	it("round-trips a hostile model through the curl body", () => {
		const filled = fillSnippet(snippet("curl"), hostile, "hi");
		const body = filled.slice(filled.indexOf("-d '") + 4, filled.lastIndexOf("'"));
		const shellDecoded = body.replaceAll("'\\''", "'");
		expect(JSON.parse(shellDecoded).model).toBe(hostile);
	});
});
