import { expect, test } from "bun:test";
import { cn } from "./utils";

test("cn keeps a theme type size next to a text colour", () => {
	expect(cn("text-meta text-ink-3")).toBe("text-meta text-ink-3");
	expect(cn("text-label", "text-foreground")).toBe(
		"text-label text-foreground",
	);
	expect(cn("text-meta", "text-label")).toBe("text-label");
	expect(cn("text-ink-2", "text-ink-3")).toBe("text-ink-3");
});
