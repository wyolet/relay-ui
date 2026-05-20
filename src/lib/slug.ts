// Port of github.com/wyolet/relay/pkg/slug.
// DNS-1123 label rules: lowercase a-z, 0-9, '-' (interior only), ≤63 chars.
// Keep in sync with the Go source — `from()` output must match for any input.

export const MAX_LEN = 63;

const VALID_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function valid(s: string): boolean {
	return VALID_RE.test(s);
}

export function from(input: string): string {
	let out = "";
	let prevDash = true;
	for (const ch of input.toLowerCase()) {
		const code = ch.charCodeAt(0);
		const isAlnum =
			(code >= 0x61 && code <= 0x7a) || (code >= 0x30 && code <= 0x39);
		if (isAlnum) {
			out += ch;
			prevDash = false;
		} else if (!prevDash) {
			out += "-";
			prevDash = true;
		}
	}
	while (out.endsWith("-")) out = out.slice(0, -1);
	if (out.length > MAX_LEN) {
		out = out.slice(0, MAX_LEN);
		while (out.endsWith("-")) out = out.slice(0, -1);
	}
	return out;
}

export function withSuffix(base: string, n: number): string {
	const suffix = `-${n}`;
	const maxBase = MAX_LEN - suffix.length;
	if (base.length > maxBase) {
		base = base.slice(0, maxBase);
		while (base.endsWith("-")) base = base.slice(0, -1);
	}
	return base + suffix;
}

export function unique(
	base: string,
	exists: (candidate: string) => boolean,
): string {
	if (!exists(base)) return base;
	for (let n = 2; ; n++) {
		const c = withSuffix(base, n);
		if (!exists(c)) return c;
	}
}

/** Alias of {@link from} — kept for existing form-hook call sites. */
export const slugify = from;

export function randomSuffix(digits = 6): string {
	const max = 10 ** digits;
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return (buf[0] % max).toString().padStart(digits, "0");
}

export function slugWithSuffix(displayName: string, digits = 6): string {
	const base = from(displayName) || "item";
	const suffix = `-${randomSuffix(digits)}`;
	const maxBase = MAX_LEN - suffix.length;
	let trimmed = base.length > maxBase ? base.slice(0, maxBase) : base;
	while (trimmed.endsWith("-")) trimmed = trimmed.slice(0, -1);
	return trimmed + suffix;
}
