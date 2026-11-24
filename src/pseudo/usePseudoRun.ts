import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { pseudoKind } from "@/api/runtimeConfig";
import {
	dryRunWarnings,
	type PlannedRowLists,
	type PseudoAnswer,
} from "@/pseudo/dryRun";
import type { FieldIssue, PointerFields } from "@/pseudo/pointerField";
import { parseRefusal, type Refusal } from "@/pseudo/refusal";
import type { StepFormWrites } from "@/shared/StepForm";

/** A refusal with the form answers `at` the refused request was built from. */
export interface Refused<F extends string, At> {
	refusal: Refusal<F>;
	at: At;
	fromDryRun: boolean;
	/** What was thrown, for what a kind's refusal carries beside its message. */
	error: unknown;
}

interface DryRunShown<Answer, F extends string, At> {
	answer: Answer;
	warnings: FieldIssue<F>[];
	at: At;
}

interface RunRequest<Body, At> {
	body: Body;
	at: At;
}

const DRY_RUN_DEBOUNCE_MS = 400;
const NO_ROWS: PlannedRowLists = { created: [] };

/**
 * A form's one-request write: a dry run lists what it would do, the submit
 * does it all or nothing, so there is no per-write progress to retry. One dry
 * run is in flight at a time; a newer request waits for it and drops its answer.
 */
export function usePseudoRun<
	Body,
	Answer extends PseudoAnswer,
	Created,
	F extends string,
	At,
>({
	kind,
	dryRun,
	create,
	pointerFields,
	toCreated,
}: {
	/** The name `/config.json` lists in `pseudoKinds` while relay serves the kind. */
	kind: string;
	dryRun: UseMutationResult<Answer, Error, Body>;
	create: UseMutationResult<Answer, Error, Body>;
	pointerFields: PointerFields<F>;
	/** The created screen's data from relay's answer; a throw reads as a refusal. */
	toCreated: (answer: Answer) => Created;
}) {
	const [created, setCreated] = useState<Created | null>(null);
	const [refused, setRefused] = useState<Refused<F, At> | null>(null);
	// The last dry run's answer, kept on screen while a newer one runs.
	const [shown, setShown] = useState<DryRunShown<Answer, F, At> | null>(null);
	const [waiting, setWaiting] = useState(false);
	const inFlight = useRef(false);
	const queued = useRef<RunRequest<Body, At> | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	// Success stays "running" until `created` is set from the answer.
	const sending = create.isPending || create.isSuccess;
	const run: StepFormWrites = {
		phase: created ? "done" : sending ? "running" : "idle",
		steps: [],
		doneCount: 0,
		error: null,
		retry: () => Promise.resolve(),
		reset() {
			setCreated(null);
			create.reset();
		},
	};

	function send(request: RunRequest<Body, At>) {
		inFlight.current = true;
		dryRun.mutate(request.body, {
			onSuccess: (answer) => {
				if (queued.current) return;
				setShown({
					answer,
					warnings: dryRunWarnings(answer, pointerFields),
					at: request.at,
				});
			},
			onError: (err) => {
				if (queued.current) return;
				setShown(null);
				setRefused({
					refusal: parseRefusal(err, pointerFields),
					at: request.at,
					fromDryRun: true,
					error: err,
				});
			},
			onSettled: () => {
				inFlight.current = false;
				const next = queued.current;
				queued.current = null;
				if (next) send(next);
			},
		});
	}

	function cancelWaiting() {
		clearTimeout(timer.current);
		setWaiting(false);
	}

	function preview(request: RunRequest<Body, At>) {
		cancelWaiting();
		if (inFlight.current) queued.current = request;
		else send(request);
	}

	return {
		/** Whether relay serves the kind; off, the form runs its own chain of writes. */
		oneRequest: pseudoKind(kind),
		run,
		created,
		refused,
		previewRows: shown?.answer ?? NO_ROWS,
		/** The shown dry run's whole answer, for what a kind answers beside its rows. */
		previewAnswer: shown?.answer,
		/** What relay accepts but warns about; never a reason to stop. */
		previewWarnings: shown?.warnings ?? [],
		/** The answers the shown dry run was built from. */
		previewAt: shown?.at,
		/** No list yet: what the write does is still being asked. */
		previewLoading: shown === null && (waiting || dryRun.isPending),
		/** A list is shown, but answers changed since it was asked. */
		previewStale: shown !== null && (waiting || dryRun.isPending),
		preview(body: Body, at: At) {
			setRefused(null);
			preview({ body, at });
		},
		/** A dry run once the answers stop changing. */
		previewSoon(body: Body, at: At) {
			setRefused(null);
			clearTimeout(timer.current);
			setWaiting(true);
			timer.current = setTimeout(
				() => preview({ body, at }),
				DRY_RUN_DEBOUNCE_MS,
			);
		},
		/** Resolves to the refusal, or null once `created` is set. */
		async submit(body: Body, at: At): Promise<Refusal<F> | null> {
			cancelWaiting();
			queued.current = null;
			setRefused(null);
			try {
				setCreated(toCreated(await create.mutateAsync(body)));
				return null;
			} catch (err) {
				create.reset();
				const refusal = parseRefusal(err, pointerFields);
				setRefused({ refusal, at, fromDryRun: false, error: err });
				return refusal;
			}
		},
	};
}
