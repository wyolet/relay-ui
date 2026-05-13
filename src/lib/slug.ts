export function slugify(input: string): string {
	return input
		.toLowerCase()
		.normalize("NFKD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-._]+|[-._]+$/g, "")
		.slice(0, 56);
}

export function randomSuffix(digits = 6): string {
	const max = 10 ** digits;
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return (buf[0] % max).toString().padStart(digits, "0");
}

export function slugWithSuffix(displayName: string, digits = 6): string {
	const base = slugify(displayName) || "item";
	return `${base}-${randomSuffix(digits)}`;
}
