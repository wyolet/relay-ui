import { useState } from "react";
import { ApiError } from "@/api/types/errors";

export type WriteRunPhase = "idle" | "running" | "failed" | "done";
export type WriteStatus = "waiting" | "running" | "done" | "failed";

export function writeStatus(
	index: number,
	doneCount: number,
	phase: WriteRunPhase,
): WriteStatus {
	if (index < doneCount) return "done";
	if (index > doneCount || phase === "idle") return "waiting";
	return phase === "failed" ? "failed" : "running";
}

function failureMessage(err: unknown): string {
	if (err instanceof ApiError) return err.body.message || err.message;
	if (err instanceof Error && err.message) return err.message;
	return "The request failed.";
}

/**
 * Runs a list of requests in order and stops at the first that fails; `retry`
 * resumes at that one, so the requests already answered are never sent twice.
 */
export function useWriteRunner<W extends { id: string }>(
	runWrite: (write: W) => Promise<void>,
) {
	const [writes, setWrites] = useState<readonly W[]>([]);
	const [doneCount, setDoneCount] = useState(0);
	const [phase, setPhase] = useState<WriteRunPhase>("idle");
	const [error, setError] = useState<string | null>(null);

	async function runFrom(list: readonly W[], from: number): Promise<boolean> {
		setPhase("running");
		setError(null);
		for (let i = from; i < list.length; i++) {
			const write = list[i];
			if (!write) continue;
			try {
				await runWrite(write);
			} catch (err) {
				setError(failureMessage(err));
				setPhase("failed");
				return false;
			}
			setDoneCount(i + 1);
		}
		setPhase("done");
		return true;
	}

	return {
		phase,
		error,
		steps: writes.map((write, index) => ({
			write,
			status: writeStatus(index, doneCount, phase),
		})),
		start(list: readonly W[]) {
			setWrites(list);
			setDoneCount(0);
			return runFrom(list, 0);
		},
		retry() {
			return runFrom(writes, doneCount);
		},
	};
}
