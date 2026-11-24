import { describe, expect, it } from "bun:test";
import type { PseudoHostKeyCreated } from "@/api/hooks/pseudoHostKeys";
import {
	DETECTION_UNREACHABLE,
	DETECTION_UNSUPPORTED,
	type PseudoByokAnswers,
	pseudoByokBody,
	storedPseudoKey,
} from "@/byok/pseudoByokBody";

function answers(patch: Partial<PseudoByokAnswers>): PseudoByokAnswers {
	return {
		hostId: "h1",
		scope: { kind: "team", id: "t1" },
		keyless: false,
		secret: "sk-test",
		accountId: "",
		accountName: "Anthropic account",
		keyName: "Anthropic key",
		tierPolicyId: "",
		receivers: [],
		...patch,
	};
}

describe("pseudoByokBody", () => {
	it("makes a new account with its tier and shares, by ids", () => {
		expect(
			pseudoByokBody(
				answers({
					tierPolicyId: "tier-2",
					receivers: [{ kind: "project", id: "p2", label: "Billing" }],
				}),
			),
		).toEqual({
			metadata: {
				displayName: "Anthropic key",
				owner: { kind: "team", id: "t1" },
			},
			spec: {
				hostId: "h1",
				value: "sk-test",
				account: { displayName: "Anthropic account" },
				tierPolicyId: "tier-2",
				shareWith: [{ kind: "project", id: "p2" }],
			},
		});
	});

	it("adds to an existing account and leaves its tier out when none is picked", () => {
		expect(pseudoByokBody(answers({ accountId: "a1" })).spec).toEqual({
			hostId: "h1",
			value: "sk-test",
			accountId: "a1",
		});
	});

	it("sends a personal key's owner as the caller, with no id", () => {
		expect(
			pseudoByokBody(answers({ scope: { kind: "personal", id: "me" } }))
				.metadata.owner,
		).toEqual({ kind: "user" });
		expect(
			pseudoByokBody(answers({ scope: { kind: "organization", id: "" } }))
				.metadata.owner,
		).toEqual({ kind: "organization" });
	});

	it("sends no value and no key name at a keyless host", () => {
		expect(
			pseudoByokBody(answers({ keyless: true, secret: "left over" })),
		).toEqual({
			metadata: { owner: { kind: "team", id: "t1" } },
			spec: { hostId: "h1", account: { displayName: "Anthropic account" } },
		});
	});
});

function answer(patch: Partial<PseudoHostKeyCreated>): PseudoHostKeyCreated {
	return {
		account: { id: "acct-1", name: "anthropic-account" },
		created: [{ kind: "account", id: "acct-1", name: "anthropic-account" }],
		hostKey: { id: "hk-1", name: "anthropic-key" },
		shares: [],
		warnings: [],
		...patch,
	};
}

const label = (r: { id: string }) => `label ${r.id}`;

describe("storedPseudoKey", () => {
	it("names the account, the key and the detected organization", () => {
		expect(
			storedPseudoKey(
				answer({
					detection: "detected",
					detected: { orgId: "org-1", orgName: "Acme" },
				}),
				label,
			),
		).toEqual({
			hostKeyName: "anthropic-key",
			accountName: "anthropic-account",
			accountMade: true,
			organization: "Acme",
			shares: [],
			shareFailures: [],
		});
		expect(
			storedPseudoKey(
				answer({ detection: "detected", detected: { orgId: "org-1" } }),
				label,
			).organization,
		).toBe("org-1");
	});

	it("says why no organization was named", () => {
		expect(
			storedPseudoKey(answer({ detection: "unsupported" }), label)
				.detectionNote,
		).toBe(DETECTION_UNSUPPORTED);
		expect(
			storedPseudoKey(answer({ detection: "unreachable" }), label)
				.detectionNote,
		).toBe(DETECTION_UNREACHABLE);
	});

	it("lists each receiver, marking the ones that held a share already", () => {
		const stored = storedPseudoKey(
			answer({
				shares: [
					{ receiver: { kind: "team", id: "t2" }, id: "s1", name: "s1" },
					{
						receiver: { kind: "project", id: "p1" },
						id: "acct-1",
						name: "anthropic-account",
						existing: true,
					},
				],
			}),
			label,
		);
		expect(stored.shares).toEqual([
			{ id: "team:t2", label: "label t2", existing: false },
			{ id: "project:p1", label: "label p1", existing: true },
		]);
	});

	it("an existing account at a keyless host: no key, nothing made", () => {
		const stored = storedPseudoKey(
			answer({ created: [], hostKey: undefined }),
			label,
		);
		expect(stored.hostKeyName).toBeUndefined();
		expect(stored.accountMade).toBe(false);
	});
});
