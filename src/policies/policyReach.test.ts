import { describe, expect, it } from "bun:test";
import type {
	ExcludedModel,
	Reachable,
	ReachedModel,
	ReachRef,
} from "@/api/hooks/reachable";
import {
	boundAccountIds,
	boundAccountNote,
	draftReachRequest,
	draftReachView,
	droppedNotes,
	emptyReachReason,
	entryWarnings,
	excludedRows,
	NOT_SERVED,
	pickerReachFrom,
	poolIdsOnReachSwitch,
	reachChoiceFor,
	reachViaLine,
} from "./policyReach";

function ref(name: string, displayName?: string): ReachRef {
	return { id: `id-${name}`, name, displayName };
}

function served(
	provider: string,
	model: string,
	hosts: string[],
	extra: Partial<ReachedModel> = {},
): ReachedModel {
	return {
		provider: ref(provider),
		model: ref(model),
		hosts: hosts.map((h) => ref(h)),
		via: [],
		upstream: [],
		...extra,
	};
}

function excluded(
	provider: string,
	model: string,
	hosts: string[],
	reason: string,
): ExcludedModel {
	return {
		code: "model_not_allowed",
		reason,
		rung: "team",
		provider: ref(provider),
		model: ref(model),
		hosts: hosts.map((h) => ref(h)),
		upstream: [],
	};
}

const TEAM_REASON = "not allowed by team platform's policy platform-default";
const TIER_REASON = "not in the build tier's policy build";

const REACH: Reachable = {
	models: [
		served("openai", "gpt-4o", ["openai-api"]),
		served("anthropic", "claude-sonnet", ["anthropic-api", "bedrock"]),
	],
	excluded: [
		excluded("anthropic", "claude-opus", ["anthropic-api"], TEAM_REASON),
		excluded("mistral", "large", ["mistral-api"], TEAM_REASON),
		excluded("mistral", "small", ["mistral-api"], TIER_REASON),
		excluded("openai", "gpt-4o", ["azure"], TIER_REASON),
	],
	dropped: [],
};

const HELD = "the share openai-shared is held for service account ci-bot";

describe("reachChoiceFor", () => {
	it("reads linked pools as pools and none as the scope", () => {
		expect(reachChoiceFor(["p1"])).toBe("pools");
		expect(reachChoiceFor([])).toBe("scope");
		expect(reachChoiceFor(null)).toBe("scope");
		expect(reachChoiceFor(undefined)).toBe("scope");
	});
});

describe("poolIdsOnReachSwitch", () => {
	it("scope drops the pools and sets them aside", () => {
		expect(poolIdsOnReachSwitch("scope", ["a", "b"], [])).toEqual({
			poolIds: [],
			setAside: ["a", "b"],
		});
	});

	it("switching back to pools restores them in order", () => {
		const toScope = poolIdsOnReachSwitch("scope", ["b", "a"], []);
		expect(
			poolIdsOnReachSwitch("pools", toScope.poolIds, toScope.setAside),
		).toEqual({ poolIds: ["b", "a"], setAside: ["b", "a"] });
	});

	it("keeps what's linked, and an earlier set-aside list through a no-op switch", () => {
		expect(poolIdsOnReachSwitch("pools", ["c"], ["a"]).poolIds).toEqual(["c"]);
		expect(poolIdsOnReachSwitch("scope", [], ["a"]).setAside).toEqual(["a"]);
	});
});

describe("draftReachRequest", () => {
	it("reads the scope with no pools, and pools in their order", () => {
		expect(draftReachRequest("team:t1", "scope", ["p1"])).toEqual({
			owner: "team:t1",
			poolIds: [],
		});
		expect(draftReachRequest("system", "pools", ["p2", "p1"])).toEqual({
			owner: "system",
			poolIds: ["p2", "p1"],
		});
	});

	it("reads as the bound account's policy when given one", () => {
		expect(draftReachRequest("project:p1", "pools", ["p1"], "acct-sa")).toEqual(
			{ owner: "project:p1", poolIds: ["p1"], account: "acct-sa" },
		);
		expect(draftReachRequest("project:p1", "scope", [], undefined)).toEqual({
			owner: "project:p1",
			poolIds: [],
		});
	});

	it("sends nothing without an owner, a choice, or a pool to read", () => {
		expect(draftReachRequest(undefined, "scope", [])).toBeUndefined();
		expect(draftReachRequest("user:u1", undefined, [])).toBeUndefined();
		expect(draftReachRequest("user:u1", "pools", [], "a1")).toBeUndefined();
	});
});

describe("boundAccountIds", () => {
	const binding = (
		policyId: string,
		accountIds: string[] | null,
		enabled?: boolean,
	) => ({ spec: { policyId, accountIds, enabled } });

	it("lists the policy's accounts once each, in binding order", () => {
		expect(
			boundAccountIds(
				[
					binding("pol", ["a2", "a1"]),
					binding("other", ["a3"]),
					binding("pol", ["a1", "a4"]),
					binding("pol", null),
				],
				"pol",
			),
		).toEqual(["a2", "a1", "a4"]);
	});

	it("skips disabled bindings, and is empty for an unbound policy", () => {
		expect(boundAccountIds([binding("pol", ["a1"], false)], "pol")).toEqual([]);
		expect(boundAccountIds([], "pol")).toEqual([]);
	});
});

describe("boundAccountNote", () => {
	it("says which account was checked only when others are bound", () => {
		expect(boundAccountNote("ci-bot", 0)).toBeUndefined();
		expect(boundAccountNote("ci-bot", 1)).toBe(
			"Checked for ci-bot; 1 other bound account may differ.",
		);
		expect(boundAccountNote("ci-bot", 3)).toBe(
			"Checked for ci-bot; 3 other bound accounts may differ.",
		);
	});
});

describe("droppedNotes", () => {
	it("puts a reason on the linked pool it names, else apart", () => {
		const notes = droppedNotes(
			[
				{
					pool: ref("main"),
					account: ref("openai-shared"),
					code: "held_for_another_lane",
					reason: HELD,
				},
				{ pool: ref("main"), code: "host_disabled", reason: "host off" },
				{ pool: ref("gone"), code: "not_found", reason: "pool not found" },
				{ code: "narrowed_by_rung", reason: "team pools leave it out" },
			],
			["id-main"],
		);
		expect(notes.byPool.get("id-main")).toEqual([HELD, "host off"]);
		expect(notes.other).toEqual(["pool not found", "team pools leave it out"]);
	});

	it("is empty for no drops", () => {
		expect(droppedNotes(null, ["p"]).other).toEqual([]);
	});
});

describe("entryWarnings", () => {
	it("leaves served model and provider entries alone", () => {
		const w = entryWarnings(["openai/gpt-4o", "anthropic"], REACH);
		expect(w.size).toBe(0);
	});

	it("warns on an excluded model entry with relay's reason as-is", () => {
		const w = entryWarnings(["anthropic/claude-opus"], REACH);
		expect(w.get("anthropic/claude-opus")).toEqual([TEAM_REASON]);
	});

	it("warns on a provider entry only when every model of it is excluded", () => {
		const w = entryWarnings(["mistral"], REACH);
		expect(w.get("mistral")).toEqual([TEAM_REASON, TIER_REASON]);
	});

	it("matches binding and provider-on-host entries by host", () => {
		const w = entryWarnings(
			[
				"openai/gpt-4o@azure",
				"openai/gpt-4o@openai-api",
				"anthropic@bedrock",
				"anthropic/claude-opus@anthropic-api",
			],
			REACH,
		);
		expect(w.get("openai/gpt-4o@azure")).toEqual([TIER_REASON]);
		expect(w.has("openai/gpt-4o@openai-api")).toBe(false);
		expect(w.has("anthropic@bedrock")).toBe(false);
		expect(w.get("anthropic/claude-opus@anthropic-api")).toEqual([TEAM_REASON]);
	});

	it("matches host entries by host", () => {
		const w = entryWarnings(["@mistral-api", "@bedrock"], REACH);
		expect(w.has("@mistral-api")).toBe(true);
		expect(w.has("@bedrock")).toBe(false);
	});

	it("says the reach doesn't serve an entry it binds nowhere", () => {
		const w = entryWarnings(["google", "openai/o3", "not a ref"], REACH);
		expect(w.get("google")).toEqual([NOT_SERVED]);
		expect(w.get("openai/o3")).toEqual([NOT_SERVED]);
		expect(w.has("not a ref")).toBe(false);
	});
});

describe("reachViaLine", () => {
	it("names pools in the form's order, then the allowing tiers", () => {
		const m = served("openai", "gpt-4o", ["openai-api"], {
			via: [
				{ pool: { id: "p2", name: "backup", displayName: "Backup" } },
				{ pool: { id: "p1", name: "main" } },
			],
			upstream: [
				{ account: ref("acct"), allowed: true, policy: ref("build", "Build") },
				{ account: ref("acct2"), allowed: false, policy: ref("free", "Free") },
			],
		});
		expect(reachViaLine(m, ["p1", "p2"])).toBe("via main, Backup · Build");
	});

	it("names the account, else the scope's keys, when no pool brings it", () => {
		const m = served("openai", "gpt-4o", [], {
			via: [{ account: ref("shared", "Shared OpenAI") }, {}],
		});
		expect(reachViaLine(m, [])).toBe("via Shared OpenAI, this scope's keys");
		expect(reachViaLine(served("x", "y", []), [])).toBeUndefined();
	});
});

describe("pickerReachFrom / excludedRows", () => {
	it("keys served models by provider/model with their hosts", () => {
		const reach = pickerReachFrom(REACH, []);
		expect([...reach.models.keys()]).toEqual([
			"openai/gpt-4o",
			"anthropic/claude-sonnet",
		]);
		expect(reach.models.get("anthropic/claude-sonnet")?.hostNames).toEqual([
			"anthropic-api",
			"bedrock",
		]);
	});

	it("lists excluded models once, skipping ones served at another host", () => {
		expect(excludedRows(REACH).map((r) => r.ref)).toEqual([
			"anthropic/claude-opus",
			"mistral/large",
			"mistral/small",
		]);
	});
});

describe("emptyReachReason", () => {
	const empty: Reachable = { models: [], excluded: [], dropped: [] };

	it("is undefined while the reach serves something", () => {
		expect(emptyReachReason(REACH)).toBeUndefined();
	});

	it("takes the refusal, else the first drop, else the first exclusion", () => {
		expect(
			emptyReachReason({
				...empty,
				refused: { code: "model_not_allowed", reason: "policy disabled" },
				dropped: [{ code: "host_disabled", reason: "host off" }],
			}),
		).toBe("policy disabled");
		expect(
			emptyReachReason({
				...empty,
				dropped: [{ code: "held_for_another_lane", reason: HELD }],
			}),
		).toBe(HELD);
		expect(
			emptyReachReason({
				...empty,
				excluded: [excluded("a", "b", [], TEAM_REASON)],
			}),
		).toBe(TEAM_REASON);
	});
});

describe("draftReachView", () => {
	const base = {
		choice: "scope" as const,
		poolIds: [],
		accountPending: false,
		requested: true,
		otherBoundAccounts: 0,
		data: REACH,
		isError: false,
		isStale: false,
	};

	it("narrows once the reach is read", () => {
		const v = draftReachView(base);
		expect(v.note).toBeUndefined();
		expect(v.checked).toBe(REACH);
		expect(v.pickerReach?.models.size).toBe(2);
	});

	it("offers nothing until the reach is known, saying why", () => {
		expect(
			draftReachView({ ...base, choice: undefined }).pickerReach?.models.size,
		).toBe(0);
		expect(
			draftReachView({ ...base, choice: "pools", poolIds: [] }).pickerReach
				?.models.size,
		).toBe(0);
		expect(draftReachView({ ...base, choice: "pools", poolIds: [] }).note).toBe(
			"Add a pool to see which models it serves.",
		);
		expect(
			draftReachView({ ...base, accountPending: true, requested: false }).note,
		).toBe("Checking what this reach serves…");
		expect(
			draftReachView({ ...base, isError: true, data: undefined }).note,
		).toBe("Couldn't check what this reach serves.");
		expect(draftReachView({ ...base, requested: false }).note).toBe(
			"Couldn't check what this reach serves.",
		);
		expect(
			draftReachView({ ...base, data: undefined }).pickerReach?.models.size,
		).toBe(0);
	});

	it("keeps the whole catalog only when relay can't answer", () => {
		expect(
			draftReachView({ ...base, isError: true, data: undefined }).pickerReach,
		).toBeUndefined();
		expect(
			draftReachView({ ...base, requested: false }).pickerReach,
		).toBeUndefined();
	});

	it("offers nothing for a refused reach", () => {
		const v = draftReachView({
			...base,
			data: {
				models: [],
				excluded: [],
				dropped: [],
				refused: { code: "model_not_allowed", reason: "policy disabled" },
			},
		});
		expect(v.pickerReach?.models.size).toBe(0);
		expect(v.note).toBe(
			"Requests under this reach are refused: policy disabled",
		);
	});

	it("says why an empty reach serves nothing, still checking entries", () => {
		const data: Reachable = {
			models: [],
			excluded: [],
			dropped: [
				{ pool: ref("main"), code: "held_for_another_lane", reason: HELD },
			],
		};
		const v = draftReachView({
			...base,
			choice: "pools",
			poolIds: ["id-main"],
			data,
		});
		expect(v.pickerReach?.models.size).toBe(0);
		expect(v.checked).toBe(data);
		expect(v.note).toBe(`This reach serves no models: ${HELD}`);
		expect(v.dropped.byPool.get("id-main")).toEqual([HELD]);
	});

	it("names the account read for when others are bound", () => {
		const v = draftReachView({
			...base,
			otherBoundAccounts: 2,
			data: { ...REACH, account: ref("ci-bot", "CI bot") },
		});
		expect(v.accountNote).toBe(
			"Checked for CI bot; 2 other bound accounts may differ.",
		);
	});
});
