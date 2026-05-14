/** Strip everything that isn't a digit. Use for numeric inputs that store digit-only strings. */
export function digitsOnly(s: string): string {
	return s.replace(/\D/g, "");
}

/** Insert a thin space between every 3rd digit from the right: "1000000" → "1 000 000". */
export function formatThousands(digits: string): string {
	if (!digits) return "";
	return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Add `delta` to a digit-only string, clamped at `min`. Empty/NaN → treated as 0. */
export function stepDigits(current: string, delta: number, min = 0): string {
	const n = Number(current || "0");
	const next = Math.max(min, (Number.isFinite(n) ? n : 0) + delta);
	return String(next);
}

/**
 * Keyboard handler that turns ArrowUp/ArrowDown into ±1 (±10 with Shift) on a
 * digit-only string input. Caller supplies the current value and apply callback.
 */
export function makeStepHandler(
	current: string,
	apply: (next: string) => void,
	min = 0,
) {
	return (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
		e.preventDefault();
		const delta = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 1);
		apply(stepDigits(current, delta, min));
	};
}
