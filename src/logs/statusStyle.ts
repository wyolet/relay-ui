// Normal traffic stays quiet; only failures take a status color.

export function statusTone(status: number, isError: boolean): string {
	if (!isError) return "text-ink-2";
	return status >= 500 ? "text-destructive" : "text-warning";
}

export function statusDot(status: number, isError: boolean): string {
	if (!isError) return "bg-n3";
	return status >= 500 ? "bg-destructive" : "bg-warning";
}
