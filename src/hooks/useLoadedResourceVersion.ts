import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export interface VersionPin {
	/** Which open form the pin belongs to; a new scope pins afresh. */
	scope: string;
	version: string | undefined;
	/** Set by reload(): re-pin as soon as the refetched row carries a new version. */
	reloading: boolean;
	/** Bumped on every reload re-pin, so the form knows to reset its draft. */
	generation: number;
}

export function initialVersionPin(
	scope: string,
	liveVersion: string | undefined,
): VersionPin {
	return { scope, version: liveVersion, reloading: false, generation: 0 };
}

/**
 * The pin for this render. A background refetch alone never moves it: the form
 * keeps sending the version it was opened with, so a concurrent change answers
 * 409 instead of being overwritten.
 */
export function nextVersionPin(
	pin: VersionPin,
	scope: string,
	liveVersion: string | undefined,
): VersionPin {
	if (pin.scope !== scope) {
		return {
			...initialVersionPin(scope, liveVersion),
			generation: pin.generation,
		};
	}
	if (pin.reloading && liveVersion !== pin.version) {
		return {
			scope,
			version: liveVersion,
			reloading: false,
			generation: pin.generation + 1,
		};
	}
	return pin;
}

/**
 * Pins `metadata.resourceVersion` for an edit form at the moment it opens.
 * `resetKey` changes when the form should reset its draft (scope change or a
 * completed reload); `markSaved` adopts the version a successful save returned.
 */
export function useLoadedResourceVersion(
	scope: string,
	liveVersion: string | undefined,
) {
	const queryClient = useQueryClient();
	const [pin, setPin] = useState<VersionPin>(() =>
		initialVersionPin(scope, liveVersion),
	);
	const current = nextVersionPin(pin, scope, liveVersion);
	if (current !== pin) setPin(current);

	function reload() {
		setPin((p) => ({ ...p, reloading: true }));
		void queryClient.invalidateQueries();
	}

	function markSaved(version: string | undefined) {
		setPin((p) => ({ ...p, version, reloading: false }));
	}

	return {
		version: current.version,
		resetKey: `${current.scope}#${current.generation}`,
		reload,
		markSaved,
	};
}
