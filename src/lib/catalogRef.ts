/**
 * Wyolet catalog-ref DSL — five canonical wire shapes.
 *
 *   provider                       kind=provider          all of provider's models, every host
 *   provider@host                  kind=provider-on-host  all of provider's models, this host
 *   provider/model                 kind=model             this model, every host
 *   provider/model@host            kind=binding           exact (model, host) binding
 *   @host                          kind=host              every binding on this host
 *
 * Wildcards are implicit (absence of segment). The literal `*` is rejected.
 * See memory/project_catalog_ref_dsl.md for the full spec.
 */

export type CatalogRefKind =
	| "provider"
	| "provider-on-host"
	| "model"
	| "binding"
	| "host";

export interface CatalogRef {
	raw: string;
	kind: CatalogRefKind;
	/** undefined for host-only refs (`@host`). */
	provider: string | undefined;
	/** undefined when omitted (= every model). */
	model: string | undefined;
	/** undefined when omitted (= every host). */
	host: string | undefined;
}

/** DNS-1123 label: lowercase alnum + hyphen, 1–63 chars, must start/end alnum. */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

function isSlug(s: string): boolean {
	return SLUG_RE.test(s);
}

/**
 * Validate a ref string. Returns an error message or `undefined` if valid.
 */
export function validateCatalogRef(ref: string): string | undefined {
	if (!ref) return "Empty ref";
	if (ref.includes("*")) return "Wildcards (`*`) aren't allowed";

	if (ref.startsWith("/")) return "Provider is required (no leading /)";
	if (ref.endsWith("/")) return "Trailing / — needs model slug";
	if (ref.endsWith("@")) return "Trailing @ — needs host slug";

	// Host-only ref: `@host` grants every binding on the host.
	if (ref.startsWith("@")) {
		const host = ref.slice(1);
		if (!isSlug(host)) return `Invalid host slug: "${host}"`;
		return undefined;
	}

	const atIdx = ref.indexOf("@");
	const slashIdx = ref.indexOf("/");
	const beforeAt = atIdx === -1 ? ref : ref.slice(0, atIdx);
	const host = atIdx === -1 ? undefined : ref.slice(atIdx + 1);

	let provider: string;
	let model: string | undefined;
	if (slashIdx === -1) {
		provider = beforeAt;
		model = undefined;
	} else {
		provider = beforeAt.slice(0, slashIdx);
		model = beforeAt.slice(slashIdx + 1);
	}

	if (!provider) return "Provider is required";
	if (!isSlug(provider)) return `Invalid provider slug: "${provider}"`;

	if (model !== undefined) {
		if (!isSlug(model)) return `Invalid model slug: "${model}"`;
	}

	if (host !== undefined) {
		if (!isSlug(host)) return `Invalid host slug: "${host}"`;
	}

	return undefined;
}

/**
 * Parse a ref string. Throws if invalid — callers should call
 * `validateCatalogRef` first to surface errors inline.
 */
export function parseCatalogRef(ref: string): CatalogRef {
	const err = validateCatalogRef(ref);
	if (err) throw new Error(`Invalid catalog ref "${ref}": ${err}`);

	if (ref.startsWith("@")) {
		return {
			raw: ref,
			kind: "host",
			provider: undefined,
			model: undefined,
			host: ref.slice(1),
		};
	}

	const atIdx = ref.indexOf("@");
	const slashIdx = ref.indexOf("/");
	const beforeAt = atIdx === -1 ? ref : ref.slice(0, atIdx);
	const host = atIdx === -1 ? undefined : ref.slice(atIdx + 1);
	const provider = slashIdx === -1 ? beforeAt : beforeAt.slice(0, slashIdx);
	const model = slashIdx === -1 ? undefined : beforeAt.slice(slashIdx + 1);

	let kind: CatalogRefKind;
	if (model === undefined && host === undefined) kind = "provider";
	else if (model === undefined) kind = "provider-on-host";
	else if (host === undefined) kind = "model";
	else kind = "binding";

	return { raw: ref, kind, provider, model, host };
}

interface FormatParts {
	/** Omit for a host-only ref. */
	provider?: string;
	/** Omit to imply "every model". */
	model?: string;
	/** Omit to imply "every host". */
	host?: string;
}

/**
 * Build a ref string in canonical shortest form. No `*` is ever emitted.
 *   { host }                             → "@host"
 *   { provider }                         → "provider"
 *   { provider, host }                   → "provider@host"
 *   { provider, model }                  → "provider/model"
 *   { provider, model, host }            → "provider/model@host"
 */
export function formatCatalogRef(parts: FormatParts): string {
	if (parts.provider === undefined) {
		if (parts.host === undefined) {
			throw new Error("Cannot format ref with neither provider nor host");
		}
		if (parts.model !== undefined) {
			throw new Error("Cannot format host-only ref with a model");
		}
		return `@${parts.host}`;
	}
	if (parts.model !== undefined && parts.host !== undefined) {
		return `${parts.provider}/${parts.model}@${parts.host}`;
	}
	if (parts.model !== undefined) return `${parts.provider}/${parts.model}`;
	if (parts.host !== undefined) return `${parts.provider}@${parts.host}`;
	return parts.provider;
}

/** Does this ref grant a given (provider, model, host) binding? */
export function refCovers(
	ref: CatalogRef,
	binding: { provider: string; model: string; host: string },
): boolean {
	if (ref.kind === "host") return ref.host === binding.host;
	if (ref.provider !== binding.provider) return false;
	if (ref.model !== undefined && ref.model !== binding.model) return false;
	if (ref.host !== undefined && ref.host !== binding.host) return false;
	return true;
}
