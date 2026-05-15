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

export interface ConcreteBinding {
	provider: string;
	model: string;
	host: string;
}

/** Does this ref grant a given (provider, model, host) binding? */
export function refCovers(ref: CatalogRef, binding: ConcreteBinding): boolean {
	if (ref.provider !== undefined && ref.provider !== binding.provider)
		return false;
	if (ref.model !== undefined && ref.model !== binding.model) return false;
	if (ref.host !== undefined && ref.host !== binding.host) return false;
	return true;
}

/**
 * Does `outer` cover every binding that `inner` covers?
 *
 * Rule: for each segment (provider, model, host), `outer` must either leave it
 * unspecified (= wildcard) or match `inner`'s value exactly. If `inner` leaves
 * a segment unspecified that `outer` constrains, `inner` is broader on that
 * axis and is NOT contained.
 *
 * Examples:
 *   refIncludesRef("anthropic", "anthropic/claude-opus-4-7")        → true
 *   refIncludesRef("anthropic/claude-opus-4-7", "anthropic")        → false
 *   refIncludesRef("@bedrock", "anthropic/claude-opus-4-7@bedrock") → true
 *   refIncludesRef("anthropic", "@bedrock")                         → false
 */
export function refIncludesRef(outer: CatalogRef, inner: CatalogRef): boolean {
	return (
		segIncludes(outer.provider, inner.provider) &&
		segIncludes(outer.model, inner.model) &&
		segIncludes(outer.host, inner.host)
	);
}

function segIncludes(outer: string | undefined, inner: string | undefined) {
	if (outer === undefined) return true;
	return inner === outer;
}

/**
 * Do these two refs *conceptually* overlap — i.e., is there any (provider,
 * model, host) binding that both would grant? This does NOT consult the
 * catalog; it only checks segment compatibility. Useful for cheap client-side
 * "these two RL bindings would fight over models" checks before submit.
 *
 * For an exact intersection against a known catalog, use
 * {@link overlappingBindings}.
 */
export function refsOverlap(a: CatalogRef, b: CatalogRef): boolean {
	return (
		segsCompatible(a.provider, b.provider) &&
		segsCompatible(a.model, b.model) &&
		segsCompatible(a.host, b.host)
	);
}

function segsCompatible(a: string | undefined, b: string | undefined) {
	if (a === undefined || b === undefined) return true;
	return a === b;
}

/**
 * Concrete bindings from `catalog` that both refs cover. Empty array means
 * they don't overlap on this catalog (even if {@link refsOverlap} returned
 * true conceptually).
 */
export function overlappingBindings(
	a: CatalogRef,
	b: CatalogRef,
	catalog: readonly ConcreteBinding[],
): ConcreteBinding[] {
	if (!refsOverlap(a, b)) return [];
	return catalog.filter((bnd) => refCovers(a, bnd) && refCovers(b, bnd));
}

/**
 * For each ref in `refs`, the concrete bindings from `catalog` it covers.
 * Useful for the picker "show what this DSL ref expands to" reveal.
 */
export function resolveRefsAgainst(
	refs: readonly CatalogRef[],
	catalog: readonly ConcreteBinding[],
): Map<string, ConcreteBinding[]> {
	const out = new Map<string, ConcreteBinding[]>();
	for (const ref of refs) {
		out.set(
			ref.raw,
			catalog.filter((bnd) => refCovers(ref, bnd)),
		);
	}
	return out;
}

/**
 * Specificity score for ref resolution. Higher = more specific.
 *
 *   10 × segments_defined + 2 × (host_defined) + 1 × (model_defined)
 *
 * Rationale: a host pin is operationally more specific than a model pin
 * (host = credentials / billing / SLA boundary), so when two refs both cover
 * a binding, the one anchored to the host wins. Model still beats provider
 * because narrowing by model removes more bindings than naming the provider.
 *
 *   provider              → 10   (e.g. "anthropic")
 *   @host                 → 12   (e.g. "@bedrock")
 *   provider/model        → 21   (e.g. "anthropic/claude-opus-4-7")
 *   provider@host         → 22   (e.g. "anthropic@bedrock")
 *   provider/model@host   → 33   (e.g. "anthropic/claude-opus-4-7@bedrock")
 *
 * Exact ties only happen between literally identical refs — resolve those by
 * declaration order at the call site.
 */
export function refSpecificity(ref: CatalogRef): number {
	let segments = 0;
	if (ref.provider !== undefined) segments++;
	if (ref.model !== undefined) segments++;
	if (ref.host !== undefined) segments++;
	const hostBonus = ref.host !== undefined ? 2 : 0;
	const modelBonus = ref.model !== undefined ? 1 : 0;
	return segments * 10 + hostBonus + modelBonus;
}

/**
 * Resolve catalog bindings to owners by **specificity-wins**: for every
 * concrete binding in `catalog`, pick the owner whose covering ref has the
 * highest {@link refSpecificity}. Exact specificity ties are broken by the
 * order in which groups were passed in.
 *
 * Critically, resolution is **per concrete binding**, not per ref. A broad
 * ref (e.g. `anthropic/claude-opus-4-7`) keeps every concrete binding that
 * no more-specific competitor steals — so a `@bedrock` ref carving out the
 * bedrock host doesn't shadow the model ref's claim on every other host.
 *
 * Returns:
 * - `assignments`: every owner mapped to the bindings it owns (in catalog
 *   order). Owners with zero owned bindings are still present.
 * - `carveouts`: bindings where the winner was contested by ≥1 other owner;
 *   each entry lists the losers, useful for surfacing "Tier-A took bedrock
 *   from Tier-B" hints in the UI.
 */
export function assignBindingsSpecificityWins<Owner>(
	groups: readonly { owner: Owner; refs: readonly CatalogRef[] }[],
	catalog: readonly ConcreteBinding[],
): {
	assignments: Map<Owner, ConcreteBinding[]>;
	carveouts: {
		binding: ConcreteBinding;
		winner: Owner;
		losers: Owner[];
	}[];
} {
	const assignments = new Map<Owner, ConcreteBinding[]>();
	for (const g of groups) assignments.set(g.owner, []);
	const carveouts: {
		binding: ConcreteBinding;
		winner: Owner;
		losers: Owner[];
	}[] = [];

	for (const bnd of catalog) {
		let bestIdx = -1;
		let bestScore = -1;
		const matchedIdxs: number[] = [];

		for (let i = 0; i < groups.length; i++) {
			const g = groups[i];
			if (!g) continue;
			let maxScoreInGroup = -1;
			for (const ref of g.refs) {
				if (!refCovers(ref, bnd)) continue;
				const s = refSpecificity(ref);
				if (s > maxScoreInGroup) maxScoreInGroup = s;
			}
			if (maxScoreInGroup < 0) continue;
			matchedIdxs.push(i);
			if (maxScoreInGroup > bestScore) {
				bestScore = maxScoreInGroup;
				bestIdx = i;
			}
		}

		if (bestIdx === -1) continue;
		const winner = groups[bestIdx];
		if (!winner) continue;
		assignments.get(winner.owner)?.push(bnd);

		if (matchedIdxs.length > 1) {
			const losers = matchedIdxs
				.filter((i) => i !== bestIdx)
				.map((i) => groups[i]?.owner)
				.filter((o): o is Owner => o !== undefined);
			carveouts.push({ binding: bnd, winner: winner.owner, losers });
		}
	}

	return { assignments, carveouts };
}

/**
 * Given a list of (refList, owner) pairs, walk them in order and assign each
 * concrete binding to the FIRST owner whose refs cover it. Returns
 * `{ assignments, conflicts }` where `conflicts` lists bindings that more
 * than one owner's refs cover (they're still assigned to the first owner,
 * matching the "pick first we saw" rule).
 */
export function assignBindingsFirstWins<Owner>(
	groups: readonly { owner: Owner; refs: readonly CatalogRef[] }[],
	catalog: readonly ConcreteBinding[],
): {
	assignments: Map<Owner, ConcreteBinding[]>;
	conflicts: { binding: ConcreteBinding; owners: Owner[] }[];
} {
	const assignments = new Map<Owner, ConcreteBinding[]>();
	for (const g of groups) assignments.set(g.owner, []);
	const conflicts: { binding: ConcreteBinding; owners: Owner[] }[] = [];

	for (const bnd of catalog) {
		const matched = groups.filter((g) =>
			g.refs.some((ref) => refCovers(ref, bnd)),
		);
		if (matched.length === 0) continue;
		const winner = matched[0];
		if (!winner) continue;
		const list = assignments.get(winner.owner);
		if (list) list.push(bnd);
		if (matched.length > 1) {
			conflicts.push({
				binding: bnd,
				owners: matched.map((g) => g.owner),
			});
		}
	}

	return { assignments, conflicts };
}
