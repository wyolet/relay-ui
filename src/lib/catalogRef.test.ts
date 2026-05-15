import { describe, expect, it } from "bun:test";
import {
	assignBindingsFirstWins,
	assignBindingsSpecificityWins,
	type ConcreteBinding,
	formatCatalogRef,
	overlappingBindings,
	parseCatalogRef,
	refCovers,
	refIncludesRef,
	refSpecificity,
	refsOverlap,
	resolveRefsAgainst,
	validateCatalogRef,
} from "./catalogRef";

const CATALOG: ConcreteBinding[] = [
	{ provider: "anthropic", model: "claude-opus-4-7", host: "anthropic" },
	{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
	{ provider: "anthropic", model: "claude-sonnet-4-6", host: "anthropic" },
	{ provider: "openai", model: "gpt-4o", host: "openai" },
	{ provider: "openai", model: "gpt-4o-mini", host: "openai" },
	{ provider: "openai", model: "gpt-4o", host: "azure" },
];

const ref = (s: string) => parseCatalogRef(s);

describe("parseCatalogRef", () => {
	it("parses the five canonical shapes", () => {
		expect(ref("anthropic").kind).toBe("provider");
		expect(ref("anthropic@bedrock").kind).toBe("provider-on-host");
		expect(ref("anthropic/claude-opus-4-7").kind).toBe("model");
		expect(ref("anthropic/claude-opus-4-7@bedrock").kind).toBe("binding");
		expect(ref("@bedrock").kind).toBe("host");
	});

	it("populates segments correctly for host-only refs", () => {
		const r = ref("@bedrock");
		expect(r.provider).toBeUndefined();
		expect(r.model).toBeUndefined();
		expect(r.host).toBe("bedrock");
	});
});

describe("validateCatalogRef", () => {
	it("rejects wildcards and structural errors", () => {
		expect(validateCatalogRef("")).toBeDefined();
		expect(validateCatalogRef("anthropic/*")).toBeDefined();
		expect(validateCatalogRef("/foo")).toBeDefined();
		expect(validateCatalogRef("anthropic/")).toBeDefined();
		expect(validateCatalogRef("anthropic@")).toBeDefined();
		expect(validateCatalogRef("Anthropic")).toBeDefined();
	});

	it("accepts canonical shapes", () => {
		expect(validateCatalogRef("anthropic")).toBeUndefined();
		expect(validateCatalogRef("@bedrock")).toBeUndefined();
		expect(validateCatalogRef("anthropic/claude-opus-4-7@bedrock")).toBeUndefined();
	});
});

describe("formatCatalogRef", () => {
	it("round-trips through parse", () => {
		for (const s of [
			"anthropic",
			"anthropic@bedrock",
			"anthropic/claude-opus-4-7",
			"anthropic/claude-opus-4-7@bedrock",
			"@bedrock",
		]) {
			const p = ref(s);
			expect(
				formatCatalogRef({ provider: p.provider, model: p.model, host: p.host }),
			).toBe(s);
		}
	});
});

describe("refCovers (concrete binding)", () => {
	const opus = CATALOG[0];
	if (!opus) throw new Error("catalog[0]");

	it("provider ref covers any binding from that provider", () => {
		expect(refCovers(ref("anthropic"), opus)).toBe(true);
		expect(refCovers(ref("openai"), opus)).toBe(false);
	});

	it("@host ref covers any binding on that host regardless of provider", () => {
		expect(refCovers(ref("@bedrock"), opus)).toBe(false);
		const opusBedrock = CATALOG[1];
		if (!opusBedrock) throw new Error("catalog[1]");
		expect(refCovers(ref("@bedrock"), opusBedrock)).toBe(true);
	});

	it("exact binding ref is most specific", () => {
		expect(refCovers(ref("anthropic/claude-opus-4-7@anthropic"), opus)).toBe(true);
		expect(refCovers(ref("anthropic/claude-opus-4-7@bedrock"), opus)).toBe(false);
	});
});

describe("refIncludesRef (ref-vs-ref subset)", () => {
	it("provider ref includes its narrower forms", () => {
		expect(refIncludesRef(ref("anthropic"), ref("anthropic/claude-opus-4-7"))).toBe(
			true,
		);
		expect(refIncludesRef(ref("anthropic"), ref("anthropic@bedrock"))).toBe(true);
		expect(
			refIncludesRef(ref("anthropic"), ref("anthropic/claude-opus-4-7@bedrock")),
		).toBe(true);
	});

	it("narrower never includes broader", () => {
		expect(refIncludesRef(ref("anthropic/claude-opus-4-7"), ref("anthropic"))).toBe(
			false,
		);
	});

	it("@host and provider don't include each other", () => {
		expect(refIncludesRef(ref("anthropic"), ref("@bedrock"))).toBe(false);
		expect(refIncludesRef(ref("@bedrock"), ref("anthropic"))).toBe(false);
	});

	it("@host includes binding refs on the same host", () => {
		expect(
			refIncludesRef(ref("@bedrock"), ref("anthropic/claude-opus-4-7@bedrock")),
		).toBe(true);
		expect(
			refIncludesRef(ref("@bedrock"), ref("anthropic/claude-opus-4-7@anthropic")),
		).toBe(false);
	});

	it("is reflexive", () => {
		expect(refIncludesRef(ref("anthropic"), ref("anthropic"))).toBe(true);
	});
});

describe("refsOverlap (conceptual)", () => {
	it("disjoint providers don't overlap", () => {
		expect(refsOverlap(ref("anthropic"), ref("openai"))).toBe(false);
	});

	it("provider and @host can overlap (intersection is provider-on-host)", () => {
		expect(refsOverlap(ref("anthropic"), ref("@bedrock"))).toBe(true);
	});

	it("two model refs disagree on model don't overlap", () => {
		expect(
			refsOverlap(
				ref("anthropic/claude-opus-4-7"),
				ref("anthropic/claude-sonnet-4-6"),
			),
		).toBe(false);
	});

	it("model + @host overlap when host could host the model", () => {
		expect(refsOverlap(ref("anthropic/claude-opus-4-7"), ref("@bedrock"))).toBe(
			true,
		);
	});

	it("is symmetric", () => {
		expect(refsOverlap(ref("anthropic"), ref("@bedrock"))).toBe(
			refsOverlap(ref("@bedrock"), ref("anthropic")),
		);
	});
});

describe("overlappingBindings (concrete intersection)", () => {
	it("returns empty when conceptually disjoint", () => {
		expect(
			overlappingBindings(ref("anthropic"), ref("openai"), CATALOG),
		).toHaveLength(0);
	});

	it("returns the bindings both refs cover", () => {
		const overlap = overlappingBindings(
			ref("anthropic"),
			ref("@bedrock"),
			CATALOG,
		);
		expect(overlap).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
		]);
	});

	it("conceptual overlap with no catalog rows returns empty", () => {
		// `anthropic/claude-opus-4-7` and `@azure` could overlap if claude were on
		// azure — but in our CATALOG it isn't.
		expect(
			overlappingBindings(
				ref("anthropic/claude-opus-4-7"),
				ref("@azure"),
				CATALOG,
			),
		).toHaveLength(0);
	});
});

describe("resolveRefsAgainst", () => {
	it("returns one entry per ref with its covered bindings", () => {
		const m = resolveRefsAgainst([ref("anthropic"), ref("@azure")], CATALOG);
		expect(m.get("anthropic")?.length).toBe(3);
		expect(m.get("@azure")?.length).toBe(1);
	});
});

describe("refSpecificity", () => {
	it("ranks the five canonical shapes in the documented order", () => {
		expect(refSpecificity(ref("anthropic"))).toBe(10);
		expect(refSpecificity(ref("@bedrock"))).toBe(12);
		expect(refSpecificity(ref("anthropic/claude-opus-4-7"))).toBe(21);
		expect(refSpecificity(ref("anthropic@bedrock"))).toBe(22);
		expect(refSpecificity(ref("anthropic/claude-opus-4-7@bedrock"))).toBe(33);
	});

	it("host beats model at equal segment count", () => {
		expect(refSpecificity(ref("anthropic@bedrock"))).toBeGreaterThan(
			refSpecificity(ref("anthropic/claude-opus-4-7")),
		);
	});

	it("@host beats bare provider", () => {
		expect(refSpecificity(ref("@bedrock"))).toBeGreaterThan(
			refSpecificity(ref("anthropic")),
		);
	});

	it("only literally identical refs tie", () => {
		expect(refSpecificity(ref("anthropic"))).toBe(refSpecificity(ref("anthropic")));
		expect(refSpecificity(ref("anthropic@bedrock"))).not.toBe(
			refSpecificity(ref("anthropic/claude-opus-4-7")),
		);
	});
});

describe("assignBindingsSpecificityWins", () => {
	it("host-anchored ref carves out the intersection without shadowing", () => {
		// A pins bedrock, B pins claude-opus everywhere. Bedrock+claude-opus is
		// contested. Other claude-opus hosts stay with B; other bedrock models
		// stay with A.
		const result = assignBindingsSpecificityWins(
			[
				{ owner: "A", refs: [ref("anthropic@bedrock")] },
				{ owner: "B", refs: [ref("anthropic/claude-opus-4-7")] },
			],
			CATALOG,
		);

		const a = result.assignments.get("A") ?? [];
		const b = result.assignments.get("B") ?? [];

		// A owns every anthropic binding on bedrock
		expect(a).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
		]);
		// B keeps claude-opus on every non-bedrock host
		expect(b).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "anthropic" },
		]);
		expect(result.carveouts).toHaveLength(1);
		expect(result.carveouts[0]?.winner).toBe("A");
		expect(result.carveouts[0]?.losers).toEqual(["B"]);
		expect(result.carveouts[0]?.binding.host).toBe("bedrock");
	});

	it("declaration order breaks ties between identical refs", () => {
		const result = assignBindingsSpecificityWins(
			[
				{ owner: "first", refs: [ref("anthropic")] },
				{ owner: "second", refs: [ref("anthropic")] },
			],
			CATALOG,
		);
		expect(result.assignments.get("first")?.length).toBe(3);
		expect(result.assignments.get("second")?.length).toBe(0);
		// Every anthropic binding is a carveout because both refs match.
		expect(result.carveouts).toHaveLength(3);
		for (const c of result.carveouts) {
			expect(c.winner).toBe("first");
			expect(c.losers).toEqual(["second"]);
		}
	});

	it("declaration order does NOT override specificity", () => {
		// Even though A (broad) is declared first, B's more-specific ref should
		// still win the bindings it covers.
		const result = assignBindingsSpecificityWins(
			[
				{ owner: "A", refs: [ref("anthropic")] },
				{ owner: "B", refs: [ref("anthropic/claude-opus-4-7@bedrock")] },
			],
			CATALOG,
		);

		expect(result.assignments.get("B")).toEqual([
			{ provider: "anthropic", model: "claude-opus-4-7", host: "bedrock" },
		]);
		// A keeps everything else anthropic
		expect(result.assignments.get("A")?.length).toBe(2);
		expect(
			result.assignments.get("A")?.every((b) => b.host !== "bedrock"),
		).toBe(true);
	});

	it("each group can have multiple refs; group's effective score is max", () => {
		// A has both a broad and a narrow ref. The narrow one (binding) should
		// determine A's effective specificity for the matching binding.
		const result = assignBindingsSpecificityWins(
			[
				{
					owner: "A",
					refs: [ref("openai"), ref("anthropic/claude-opus-4-7@bedrock")],
				},
				{ owner: "B", refs: [ref("anthropic@bedrock")] },
			],
			CATALOG,
		);
		// claude-opus@bedrock: A's binding ref (33) beats B's provider-on-host (22)
		expect(
			result.assignments
				.get("A")
				?.some(
					(b) =>
						b.model === "claude-opus-4-7" &&
						b.host === "bedrock" &&
						b.provider === "anthropic",
				),
		).toBe(true);
	});

	it("bindings no one covers stay unassigned with no carveout", () => {
		const result = assignBindingsSpecificityWins(
			[{ owner: "A", refs: [ref("openai")] }],
			CATALOG,
		);
		const total = (result.assignments.get("A") ?? []).length;
		expect(total).toBe(3); // openai bindings only
		expect(result.carveouts).toHaveLength(0);
	});
});

describe("assignBindingsFirstWins", () => {
	it("assigns each binding to the first matching owner", () => {
		const result = assignBindingsFirstWins(
			[
				{ owner: "rl-a", refs: [ref("anthropic")] },
				{ owner: "rl-b", refs: [ref("@bedrock")] },
				{ owner: "rl-c", refs: [ref("openai")] },
			],
			CATALOG,
		);

		// anthropic on bedrock matches both rl-a and rl-b → rl-a wins
		expect(result.assignments.get("rl-a")?.length).toBe(3);
		expect(result.assignments.get("rl-b")?.length).toBe(0);
		expect(result.assignments.get("rl-c")?.length).toBe(3);
		expect(result.conflicts).toHaveLength(1);
		expect(result.conflicts[0]?.binding.model).toBe("claude-opus-4-7");
		expect(result.conflicts[0]?.binding.host).toBe("bedrock");
		expect(result.conflicts[0]?.owners).toEqual(["rl-a", "rl-b"]);
	});

	it("leaves uncovered bindings unassigned without conflict", () => {
		const result = assignBindingsFirstWins(
			[{ owner: "x", refs: [ref("anthropic")] }],
			CATALOG,
		);
		const assigned = result.assignments.get("x") ?? [];
		expect(assigned.every((b) => b.provider === "anthropic")).toBe(true);
		expect(result.conflicts).toHaveLength(0);
	});
});
