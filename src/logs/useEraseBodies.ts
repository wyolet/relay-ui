import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useEraseLogBodies } from "@/api/hooks/logs";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { serviceAccountsListQueryOptions } from "@/api/hooks/serviceAccounts";
import { usersListQueryOptions } from "@/api/hooks/users";
import { feature } from "@/api/runtimeConfig";
import { ApiError } from "@/api/types/errors";
import { displayLabel } from "@/lib/displayLabel";
import {
	describeEraseScope,
	type EraseSelection,
	type EraseTarget,
	eraseConfirmName,
	toEraseBody,
} from "./eraseScope";

export interface EraseFailure {
	title: string;
	message: string;
}

function toFailure(err: unknown): EraseFailure {
	if (!(err instanceof ApiError)) {
		return { title: "Erasing failed", message: "Please try again." };
	}
	const message = err.body.message;
	switch (err.status) {
		case 501:
			return {
				title: "This relay's payload store can't erase captured bodies",
				message,
			};
		case 403:
			return { title: "Only an admin can erase captured bodies", message };
		case 500:
			return {
				title: "Erasing failed part-way — some bodies may already be gone",
				message,
			};
		default:
			return { title: "Erasing failed", message };
	}
}

/**
 * State for the erase-bodies dialog: the scope (fixed by a detail page or
 * picked on the logs page), the typed confirmation, and the outcome.
 */
export function useEraseBodies(fixed?: EraseSelection) {
	const erase = useEraseLogBodies();
	const [selection, setSelection] = useState<EraseSelection>(fixed ?? {});
	const [typed, setTyped] = useState("");
	const [failure, setFailure] = useState<EraseFailure | undefined>();
	const [erased, setErased] = useState<number | null>(null);

	const confirmName = eraseConfirmName(selection);

	function select(next: EraseSelection) {
		setSelection(next);
		setTyped("");
		setFailure(undefined);
	}

	async function submit() {
		setFailure(undefined);
		try {
			setErased(await erase.mutateAsync(toEraseBody(selection)));
		} catch (err) {
			setFailure(toFailure(err));
		}
	}

	return {
		selection,
		scopeLabel: describeEraseScope(selection),
		confirmName,
		typed,
		failure,
		erased,
		erasing: erase.isPending,
		canErase:
			confirmName !== undefined && typed === confirmName && !erase.isPending,
		setProject: (project?: EraseTarget) => select({ ...selection, project }),
		setPrincipal: (principal?: EraseTarget) =>
			select({ ...selection, principal }),
		setTyped,
		submit: () => void submit(),
	};
}

/** Projects and principals to pick from when no page fixes the scope. */
export function useEraseScopeOptions() {
	const projects = useQuery(projectsListQueryOptions);
	const accounts = useQuery(serviceAccountsListQueryOptions);
	// /users answers 404 on a relay with no user store; config.json says so.
	const users = useQuery({
		...usersListQueryOptions,
		enabled: feature("users"),
	});

	const projectTargets: EraseTarget[] = (projects.data?.items ?? []).flatMap(
		(p) =>
			p.metadata.id
				? [
						{
							id: p.metadata.id,
							name: p.metadata.name,
							label: displayLabel(p.metadata),
							kind: "project",
						},
					]
				: [],
	);
	const principalTargets: EraseTarget[] = [
		...(users.data ?? []).map(
			(u): EraseTarget => ({
				id: u.id,
				name: u.username,
				label: u.username,
				kind: "user",
			}),
		),
		...(accounts.data?.items ?? []).flatMap((sa): EraseTarget[] =>
			sa.metadata.id
				? [
						{
							id: sa.metadata.id,
							name: sa.metadata.name,
							label: displayLabel(sa.metadata),
							kind: "service account",
						},
					]
				: [],
		),
	];
	return { projects: projectTargets, principals: principalTargets };
}
