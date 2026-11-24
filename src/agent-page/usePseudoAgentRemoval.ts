import { useState } from "react";
import {
	CHANGED_MESSAGE,
	pseudoRemovalBody,
	REMOVAL_POINTER_FIELDS,
	type RemovalField,
	type RemovalList,
	refusedKeepId,
	removalOptions,
} from "@/agent-page/pseudoRemoval";
import { useAgentRemoved } from "@/agent-page/useAgentRemoval";
import {
	type AgentRemoval,
	type AgentRemovalAnswer,
	RemovalChanged,
	useAgentRemovalDryRun,
	useDryRunAgentRemoval,
	useRemoveAgent,
} from "@/api/hooks/pseudoAgentRemovals";
import { pseudoKind } from "@/api/runtimeConfig";
import { isResourceInUse, PseudoRefusal } from "@/api/types/errors";
import { dryRunWarnings, warningMessages } from "@/pseudo/dryRun";
import { parseRefusal } from "@/pseudo/refusal";
import { type Refused, usePseudoRun } from "@/pseudo/usePseudoRun";
import type { ShortcutTarget } from "@/shortcuts/registry";

const REMOVAL_KIND = "agent-removals";

/** Whether relay removes an agent in one request; otherwise the dialog runs its chain of deletes. */
export function removesInOneRequest(): boolean {
	return pseudoKind(REMOVAL_KIND);
}

type Keep = readonly string[];

function usePseudoRemovalRun() {
	return usePseudoRun<
		AgentRemoval,
		AgentRemovalAnswer,
		AgentRemovalAnswer,
		RemovalField,
		Keep
	>({
		kind: REMOVAL_KIND,
		dryRun: useDryRunAgentRemoval(),
		create: useRemoveAgent(),
		pointerFields: REMOVAL_POINTER_FIELDS,
		toCreated: (answer) => answer,
	});
}

function listOf(answer: AgentRemovalAnswer): RemovalList {
	return { deleted: answer.deleted ?? [], kept: answer.kept ?? [] };
}

/**
 * Removing an agent in one request. Opening asks relay what goes; unticking a
 * policy or pool asks again, since keeping one can keep what it links. The
 * removal sends the listed ids back, so a set that changed meanwhile is
 * answered with the new list instead of deleted.
 */
export function usePseudoAgentRemoval(target: ShortcutTarget) {
	const removed = useAgentRemoved(target);
	const pseudo = usePseudoRemovalRun();
	const first = useAgentRemovalDryRun(pseudoRemovalBody(target.id, []), {
		enabled: true,
	});
	const [keep, setKeep] = useState<Keep>([]);
	const [typed, setTyped] = useState("");

	const firstRefused: Refused<RemovalField, Keep> | null = first.error
		? {
				refusal: parseRefusal(first.error, REMOVAL_POINTER_FIELDS),
				at: [],
				fromDryRun: true,
				error: first.error,
			}
		: null;
	const refused = pseudo.refused ?? firstRefused;
	const refusal = refused?.refusal;
	const changed =
		refused?.error instanceof RemovalChanged ? refused.error : null;
	const answer = pseudo.previewAnswer ?? first.data;
	const list = changed ?? (answer ? listOf(answer) : undefined);

	const blockers = isResourceInUse(refused?.error)
		? refused.error.blockers
		: [];
	const keepRefused = refusal?.kind === "field" && refusal.field === "keep";
	const keepRefusedId =
		keepRefused && refused?.error instanceof PseudoRefusal
			? refusedKeepId(refused.error.pointer, refused.at)
			: undefined;
	const options = list
		? removalOptions(
				list,
				keepRefusedId && refusal?.kind === "field"
					? { id: keepRefusedId, message: refusal.message }
					: undefined,
			)
		: [];
	const shownByRow =
		keepRefused && options.some((o) => o.value === keepRefusedId);
	const refusalMessage = changed
		? CHANGED_MESSAGE
		: blockers.length > 0 || shownByRow || refusal?.kind === "issues"
			? undefined
			: refusal?.message;

	const running = pseudo.run.phase !== "idle";
	const asking = pseudo.previewLoading || pseudo.previewStale;
	const refusedForGood =
		refused !== null &&
		(refused.fromDryRun ||
			blockers.length > 0 ||
			refusal?.kind === "issues" ||
			keepRefused);

	function toggle(id: string) {
		const next = keep.includes(id)
			? keep.filter((k) => k !== id)
			: [...keep, id];
		setKeep(next);
		pseudo.previewSoon(pseudoRemovalBody(target.id, next), next);
	}

	return {
		loaded: list !== undefined || refused !== null,
		rows: { deleted: list?.deleted ?? [] },
		options,
		ticked: options
			.filter((o) => !keep.includes(o.value) && !o.disabled)
			.map((o) => o.value),
		toggle,
		stale: asking,
		warnings:
			answer && !changed
				? warningMessages(dryRunWarnings(answer, REMOVAL_POINTER_FIELDS))
				: [],
		issues:
			refusal?.kind === "issues"
				? refusal.issues.map((i) => i.message)
				: undefined,
		blockers,
		refusalMessage,
		typed,
		setTyped,
		running,
		canRemove:
			list !== undefined &&
			!asking &&
			!running &&
			!refusedForGood &&
			typed === target.name,
		remove() {
			if (!list) return;
			const body = pseudoRemovalBody(target.id, keep, list.deleted);
			void pseudo.submit(body, keep).then((r) => {
				if (r === null) removed();
				else if (r.kind === "field" && r.field === "expect") setTyped("");
			});
		},
	};
}
