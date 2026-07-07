import {
	AlertCircle,
	Boxes,
	Building2,
	Globe,
	Search,
	TextCursorInput,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	fieldFocusClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { KIND_META } from "@/config/catalogRef";
import { HostLogo } from "@/hosts/HostLogo";
import {
	type CatalogRef,
	formatCatalogRef,
	parseCatalogRef,
	refCovers,
	validateCatalogRef,
} from "@/lib/catalogRef";
import { from as slugFrom } from "@/lib/slug";
import { cn } from "@/lib/utils";
import {
	type HostRow,
	type ModelRow,
	type PickerIndex,
	type ProviderRow,
	usePickerCatalog,
} from "@/models/usePickerCatalog";
import { Chip } from "@/shared/Chip";
import { OptionRow } from "@/shared/OptionRow";

type Tab = "summary" | "providers" | "models" | "hosts" | "raw";

interface ModelPickerProps {
	value: string[];
	onChange: (next: string[]) => void;
	includeDeprecated: boolean;
	/**
	 * Optional list of catalog-ref strings (a parent policy's allowed catalog)
	 * to restrict the providers / models / hosts shown to only those covered
	 * by at least one of these refs. When provided, the "Restrict access"
	 * toggle is hidden and the picker is always in restricted mode.
	 */
	restrictTo?: readonly string[];
}

/**
 * Picker that emits catalog-ref strings. Three tabs (Providers / Models /
 * Hosts) all back the same underlying selection — toggling something in any
 * tab adds or removes the corresponding ref(s).
 *
 * "Selected" vs "covered": a row is *covered* when a coarser ref already
 * grants it (e.g. provider ref covers all of its models). Covered rows render
 * as grey-checked and are read-only — to deselect, the operator removes the
 * coarser ref.
 */
export function ModelPicker({
	value,
	onChange,
	includeDeprecated,
	restrictTo,
}: ModelPickerProps) {
	const [tab, setTab] = useState<Tab>("providers");
	const [q, setQ] = useState("");
	const [forceRestrict, setForceRestrict] = useState(false);

	// Empty `value` is the "allow all" sentinel per backend semantics. The
	// "Restrict access" switch flips between empty (all) and editing mode.
	// `forceRestrict` keeps the picker open when the operator wants to narrow
	// access but hasn't picked anything yet. When `restrictTo` is provided the
	// toggle is hidden — the picker is always restricted to that parent grant.
	const hasParentRestriction = restrictTo !== undefined;
	const restricted = hasParentRestriction || value.length > 0 || forceRestrict;
	function setRestricted(next: boolean) {
		setForceRestrict(next);
		if (!next) onChange([]);
	}

	const index = usePickerCatalog(restrictTo);
	const { providers, hosts } = index;

	const refs = useMemo(
		() =>
			value
				.map((r) => {
					try {
						return parseCatalogRef(r);
					} catch {
						return null;
					}
				})
				.filter((r): r is CatalogRef => r !== null),
		[value],
	);

	function setRefs(next: CatalogRef[]) {
		// Round-trip refs verbatim — newly created refs already have `raw` set to
		// the canonical form, existing ones keep whatever the operator typed.
		onChange(next.map((r) => r.raw));
	}

	function removeRaw(raw: string): void {
		onChange(value.filter((r) => r !== raw));
	}

	function toggleProvider(p: ProviderRow): void {
		const name = p.name;
		const ref = formatCatalogRef({ provider: name });
		const existing = refs.find(
			(r) => r.kind === "provider" && r.provider === name,
		);
		if (existing) {
			setRefs(refs.filter((r) => r.raw !== existing.raw));
			return;
		}
		// Drop any finer-grained refs subsumed by this provider grant.
		setRefs([...refs.filter((r) => r.provider !== name), parseCatalogRef(ref)]);
	}

	function toggleModel(m: ModelRow): void {
		const ref = formatCatalogRef({ provider: m.provider, model: m.name });
		// If covered by a provider ref, do nothing — operator must clear that first.
		if (refs.some((r) => r.kind === "provider" && r.provider === m.provider)) {
			return;
		}
		const existing = refs.find(
			(r) =>
				r.kind === "model" && r.provider === m.provider && r.model === m.name,
		);
		if (existing) {
			setRefs(refs.filter((r) => r.raw !== existing.raw));
			return;
		}
		// Drop binding-level refs subsumed by this model-level grant.
		setRefs([
			...refs.filter(
				(r) =>
					!(
						r.kind === "binding" &&
						r.provider === m.provider &&
						r.model === m.name
					),
			),
			parseCatalogRef(ref),
		]);
	}

	function toggleHost(h: HostRow): void {
		// Selecting a host emits a single `@{host}` ref (host-only grant) — all
		// current and future bindings on this host, regardless of provider.
		const hostName = h.name;
		const existing = refs.find((r) => r.kind === "host" && r.host === hostName);
		if (existing) {
			setRefs(refs.filter((r) => r.raw !== existing.raw));
			return;
		}
		// Drop any finer-grained host-scoped refs subsumed by this host grant.
		const next = refs.filter(
			(r) => !(r.kind === "binding" && r.host === hostName),
		);
		next.push(parseCatalogRef(formatCatalogRef({ host: hostName })));
		setRefs(next);
	}

	const filteredProviders = useMemo(
		() => filter(providers, q, (p) => [p.name, p.displayName]),
		[providers, q],
	);
	const visibleModels = useMemo(
		() =>
			includeDeprecated
				? index.modelRows
				: index.modelRows.filter((m) => !m.deprecated),
		[index.modelRows, includeDeprecated],
	);
	const filteredModels = useMemo(
		() => filter(visibleModels, q, (m) => [m.name, m.displayName, m.provider]),
		[visibleModels, q],
	);
	const filteredHosts = useMemo(
		() => filter(hosts, q, (h) => [h.name, h.displayName]),
		[hosts, q],
	);

	return (
		<div className="flex flex-col rounded-md border border-border bg-card overflow-hidden">
			{!hasParentRestriction && (
				<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
					<div className="flex items-center gap-2.5">
						<Switch
							checked={restricted}
							onCheckedChange={setRestricted}
							aria-label="Restrict catalog access"
						/>
						<div className="leading-tight">
							<div className="text-[12px] font-medium text-foreground">
								{restricted ? "Restricted" : "All catalog allowed"}
							</div>
							<div className="text-[10px] text-muted-foreground">
								{restricted
									? "Pick what relay keys may call."
									: "Every provider, model, and host."}
							</div>
						</div>
					</div>
				</div>
			)}

			{!restricted ? null : (
				<>
					<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
						<Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
							<TabsList>
								<TabsTrigger value="providers">
									<Building2 className="w-3 h-3" />
									Providers
								</TabsTrigger>
								<TabsTrigger value="models">
									<Boxes className="w-3 h-3" />
									Models
								</TabsTrigger>
								<TabsTrigger value="hosts">
									<Globe className="w-3 h-3" />
									Hosts
								</TabsTrigger>
								<TabsTrigger value="raw">
									<TextCursorInput className="w-3 h-3" />
									Raw
								</TabsTrigger>
							</TabsList>
						</Tabs>
						{tab !== "raw" && (
							<div className="relative flex-1 max-w-xs">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
								<input
									type="text"
									value={q}
									onChange={(e) => setQ(e.currentTarget.value)}
									placeholder={`Search ${tab}…`}
									className={cn(
										"w-full h-7 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground transition-[color,box-shadow,background-color]",
										fieldFrameClassName,
										fieldFocusClassName,
									)}
								/>
							</div>
						)}
					</div>

					<div className="max-h-72 overflow-y-auto">
						{tab === "providers" && (
							<ProviderList
								providers={filteredProviders}
								index={index}
								refs={refs}
								onToggle={toggleProvider}
							/>
						)}
						{tab === "models" && (
							<ModelList
								models={filteredModels}
								index={index}
								refs={refs}
								onToggleModel={toggleModel}
							/>
						)}
						{tab === "hosts" && (
							<HostList
								hosts={filteredHosts}
								index={index}
								refs={refs}
								onToggle={toggleHost}
							/>
						)}
						{tab === "raw" && (
							<RawEditor value={value} onChange={onChange} index={index} />
						)}
					</div>

					{tab !== "raw" && (
						<>
							<SelectionFooter refs={value} onRemove={removeRaw} />
							{refs.length > 0 && (
								<SelectionSummary
									refs={refs}
									index={index}
									includeDeprecated={includeDeprecated}
								/>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
}

function filter<T>(items: T[], q: string, fields: (item: T) => string[]): T[] {
	const ql = q.trim().toLowerCase();
	if (!ql) return items;
	return items.filter((it) =>
		fields(it).some((f) => f.toLowerCase().includes(ql)),
	);
}

// --- Sub-views ---

function ProviderList({
	providers,
	index,
	refs,
	onToggle,
}: {
	providers: ProviderRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggle: (p: ProviderRow) => void;
}) {
	if (providers.length === 0) return <Empty label="No providers" />;
	return (
		<ul className="divide-y divide-border">
			{providers.map((p) => {
				const name = p.name;
				const selected = refs.some(
					(r) => r.kind === "provider" && r.provider === name,
				);
				const modelCount = (index.modelsByProvider.get(name) ?? []).length;
				return (
					<li key={p.id}>
						<OptionRow
							onClick={() => onToggle(p)}
							className="justify-between"
						>
							<span className="flex items-center gap-2.5 min-w-0">
								<RowCheckbox state={selected ? "on" : "off"} />
								<span className="text-sm text-foreground truncate">
									{p.displayName}
								</span>
								<code className="text-[10px] font-mono text-muted-foreground">
									{name}
								</code>
							</span>
							<span className="text-[11px] text-muted-foreground tabular-nums">
								{modelCount} model{modelCount === 1 ? "" : "s"}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}

function ModelList({
	models,
	index,
	refs,
	onToggleModel,
}: {
	models: ModelRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggleModel: (m: ModelRow) => void;
}) {
	if (models.length === 0) return <Empty label="No models" />;
	return (
		<ul className="divide-y divide-border">
			{models.map((m) => {
				const coveredByProvider = refs.some(
					(r) => r.kind === "provider" && r.provider === m.provider,
				);
				const ownRef = refs.find(
					(r) =>
						r.kind === "model" &&
						r.provider === m.provider &&
						r.model === m.name,
				);
				const state: CheckState = coveredByProvider
					? "covered"
					: ownRef
						? "on"
						: "off";
				return (
					<li key={m.id}>
						<OptionRow
							onClick={() => onToggleModel(m)}
							disabled={coveredByProvider}
							className="justify-between"
						>
							<span className="flex items-center gap-2.5 min-w-0">
								<RowCheckbox state={state} />
								<span className="min-w-0">
									<span className="text-sm text-foreground truncate block">
										{m.displayName}
									</span>
									<code className="text-[10px] font-mono text-muted-foreground">
										{m.provider}/{m.name}
									</code>
								</span>
							</span>
							<span className="flex items-center gap-1">
								{m.hostNames.map((hostName) => {
									const h = index.hostsByName.get(hostName);
									if (!h) return null;
									const bindingCovered = refs.some((r) =>
										refCovers(r, {
											provider: m.provider,
											model: m.name,
											host: hostName,
										}),
									);
									return (
										<span
											key={hostName}
											title={`Served via ${h.displayName}`}
											className={[
												"inline-flex items-center justify-center rounded-sm p-0.5 transition-opacity",
												bindingCovered ? "opacity-100" : "opacity-40",
											].join(" ")}
										>
											<HostLogo host={h.logo} size={16} />
										</span>
									);
								})}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}

function HostList({
	hosts,
	index,
	refs,
	onToggle,
}: {
	hosts: HostRow[];
	index: PickerIndex;
	refs: CatalogRef[];
	onToggle: (h: HostRow) => void;
}) {
	if (hosts.length === 0) return <Empty label="No hosts" />;
	return (
		<ul className="divide-y divide-border">
			{hosts.map((h) => {
				const name = h.name;
				const bindings = index.bindingsByHostName.get(name) ?? [];
				const total = bindings.length;
				const covered = bindings.filter((b) =>
					refs.some((r) =>
						refCovers(r, { provider: b.provider, model: b.model, host: name }),
					),
				).length;
				const state: CheckState =
					total === 0
						? "off"
						: covered === total
							? "on"
							: covered > 0
								? "indeterminate"
								: "off";
				const hostGranted = refs.some(
					(r) => r.kind === "host" && r.host === name,
				);
				const finalState: CheckState = hostGranted ? "on" : state;
				return (
					<li key={h.id}>
						<OptionRow
							onClick={() => onToggle(h)}
							className="justify-between"
						>
							<span className="flex items-center gap-2.5 min-w-0">
								<RowCheckbox state={finalState} />
								<HostLogo host={h.logo} size={20} />
								<span className="min-w-0">
									<span className="text-sm text-foreground truncate block">
										{h.displayName}
									</span>
									<code className="text-[10px] font-mono text-muted-foreground">
										{name}
									</code>
								</span>
							</span>
							<span className="text-[11px] text-muted-foreground tabular-nums">
								{total === 0 ? "0 models" : `${covered}/${total}`}
							</span>
						</OptionRow>
					</li>
				);
			})}
		</ul>
	);
}

function SelectionFooter({
	refs,
	onRemove,
}: {
	refs: string[];
	onRemove: (raw: string) => void;
}) {
	if (refs.length === 0) {
		return (
			<div className="flex items-start gap-1.5 border-t border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
				<AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
				<span>
					Nothing selected — an empty grant means{" "}
					<strong>full catalog access</strong>. Pick at least one entry to
					restrict it.
				</span>
			</div>
		);
	}
	return (
		<div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-1">
			{refs.map((r) => (
				<Chip
					key={r}
					shape="box"
					tone="primary"
					mono
					label={r}
					onRemove={() => onRemove(r)}
				/>
			))}
		</div>
	);
}

function slugifyRef(ref: string): string {
	return ref
		.split(/([/@])/)
		.map((part, i) => (i % 2 === 0 ? slugFrom(part) : part))
		.join("");
}

function editDistance(a: string, b: string): number {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;
	let prev = new Array<number>(n + 1);
	let curr = new Array<number>(n + 1);
	for (let j = 0; j <= n; j++) prev[j] = j;
	for (let i = 1; i <= m; i++) {
		curr[0] = i;
		for (let j = 1; j <= n; j++) {
			const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
			curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[n];
}

function allRefs(index: PickerIndex): string[] {
	const out: string[] = [];
	for (const p of index.providersByName.keys()) out.push(p);
	for (const [prov, rows] of index.modelsByProvider) {
		for (const r of rows) out.push(`${prov}/${r.name}`);
	}
	for (const h of index.hostsByName.keys()) out.push(`@${h}`);
	return out;
}

function closestRef(ref: string, index: PickerIndex): string | undefined {
	const candidates = allRefs(index);
	let best: string | undefined;
	let bestDist = Number.POSITIVE_INFINITY;
	for (const c of candidates) {
		const d = editDistance(ref, c);
		if (d < bestDist) {
			best = c;
			bestDist = d;
		}
	}
	if (best === undefined) return undefined;
	const threshold = Math.max(2, Math.floor(ref.length * 0.34));
	return bestDist <= threshold ? best : undefined;
}

function checkRefAgainstCatalog(
	ref: string,
	index: PickerIndex,
): string | undefined {
	const bad = ref.match(/[.:]/);
	if (bad) {
		const slugged = slugifyRef(ref);
		if (
			slugged !== ref &&
			checkRefAgainstCatalog(slugged, index) === undefined
		) {
			return `"${bad[0]}" isn't allowed in refs — did you mean "${slugged}"?`;
		}
		const near = closestRef(slugged || ref, index);
		if (near) {
			return `"${bad[0]}" isn't allowed in refs — closest match is "${near}".`;
		}
		return `"${bad[0]}" isn't allowed — refs use DNS-style slugs. Replace "." and ":" with "-".`;
	}
	const synErr = validateCatalogRef(ref);
	if (synErr) return synErr;
	const parsed = parseCatalogRef(ref);

	if (parsed.kind === "host") {
		if (!parsed.host || !index.hostsByName.has(parsed.host)) {
			return `Host "${parsed.host}" doesn't exist`;
		}
		return undefined;
	}

	if (!parsed.provider || !index.providersByName.has(parsed.provider)) {
		return `Provider "${parsed.provider}" doesn't exist`;
	}

	const providerModels = index.modelsByProvider.get(parsed.provider) ?? [];

	if (parsed.model !== undefined) {
		const model = providerModels.find((m) => m.name === parsed.model);
		if (!model) {
			const near = closestRef(`${parsed.provider}/${parsed.model}`, index);
			const hint = near ? ` — did you mean "${near}"?` : "";
			return `Model "${parsed.provider}/${parsed.model}" doesn't exist${hint}`;
		}
		if (parsed.host !== undefined) {
			if (!index.hostsByName.has(parsed.host)) {
				return `Host "${parsed.host}" doesn't exist`;
			}
			if (!model.hostNames.includes(parsed.host)) {
				return `Model "${parsed.provider}/${parsed.model}" isn't served on host "${parsed.host}"`;
			}
		}
		return undefined;
	}

	if (parsed.host !== undefined) {
		if (!index.hostsByName.has(parsed.host)) {
			return `Host "${parsed.host}" doesn't exist`;
		}
		const hasBinding = providerModels.some((m) =>
			m.hostNames.includes(parsed.host as string),
		);
		if (!hasBinding) {
			return `No "${parsed.provider}" models on host "${parsed.host}"`;
		}
	}
	return undefined;
}

function RawEditor({
	value,
	onChange,
	index,
}: {
	value: string[];
	onChange: (next: string[]) => void;
	index: PickerIndex;
}) {
	const [draft, setDraft] = useState(() => value.join("\n"));

	const lines = draft.split("\n");
	const lineInfo = lines.map((raw, idx) => {
		const trimmed = raw.trim();
		if (!trimmed) return { idx, raw, trimmed, error: undefined };
		return {
			idx,
			raw,
			trimmed,
			error: checkRefAgainstCatalog(trimmed, index),
		};
	});

	const errors = lineInfo.filter((l) => l.trimmed && l.error);

	function emit(nextDraft: string) {
		setDraft(nextDraft);
		const validRefs: string[] = [];
		for (const line of nextDraft.split("\n")) {
			const t = line.trim();
			if (!t) continue;
			if (checkRefAgainstCatalog(t, index)) continue;
			if (validRefs.includes(t)) continue;
			validRefs.push(t);
		}
		onChange(validRefs);
	}

	return (
		<div className="flex flex-col gap-2 p-3">
			<div className="text-[11px] text-muted-foreground leading-relaxed">
				One ref per line. Examples:{" "}
				<code className="font-mono text-foreground/80">anthropic</code>,{" "}
				<code className="font-mono text-foreground/80">
					anthropic/claude-opus-4-7
				</code>
				, <code className="font-mono text-foreground/80">@bedrock</code>.
				<br />
				Refs are DNS-style slugs — not upstream model names. Replace{" "}
				<code className="font-mono text-foreground/80">.</code> and{" "}
				<code className="font-mono text-foreground/80">:</code> with{" "}
				<code className="font-mono text-foreground/80">-</code>.
			</div>
			<Textarea
				value={draft}
				onChange={(e) => emit(e.currentTarget.value)}
				spellCheck={false}
				rows={8}
				placeholder="anthropic&#10;openai/gpt-4o&#10;@bedrock"
				className="min-h-32 font-mono text-xs leading-relaxed"
			/>
			{errors.length > 0 && (
				<ul className="space-y-0.5 text-[11px]">
					{errors.map((e) => (
						<li
							key={`${e.idx}-${e.raw}`}
							className="flex items-start gap-1.5 text-destructive"
						>
							<AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
							<span>
								<span className="font-medium">Line {e.idx + 1}:</span>{" "}
								<code className="font-mono">{e.trimmed}</code> — {e.error}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

interface RefCounts {
	providers?: number;
	models?: number;
	hosts?: number;
}

function countsForRef(
	ref: CatalogRef,
	index: PickerIndex,
	includeDeprecated: boolean,
): RefCounts {
	const filter = (rows: ModelRow[]) =>
		includeDeprecated ? rows : rows.filter((r) => !r.deprecated);

	if (ref.kind === "host" && ref.host) {
		const rows = filter(
			index.modelRows.filter((m) => m.hostNames.includes(ref.host as string)),
		);
		const providers = new Set(rows.map((m) => m.provider));
		return { providers: providers.size, models: rows.length };
	}
	if (!ref.provider) return {};
	const providerRows = filter(index.modelsByProvider.get(ref.provider) ?? []);

	if (ref.kind === "provider") {
		const hosts = new Set<string>();
		for (const m of providerRows) for (const h of m.hostNames) hosts.add(h);
		return { models: providerRows.length, hosts: hosts.size };
	}
	if (ref.kind === "provider-on-host" && ref.host) {
		const rows = providerRows.filter((m) =>
			m.hostNames.includes(ref.host as string),
		);
		return { models: rows.length };
	}
	if (ref.kind === "model" && ref.model) {
		const row = providerRows.find((m) => m.name === ref.model);
		if (!row) return {};
		return { hosts: row.hostNames.length };
	}
	return {};
}

function formatCounts(c: RefCounts): string | undefined {
	const parts: string[] = [];
	if (c.providers !== undefined) {
		parts.push(`${c.providers} provider${c.providers === 1 ? "" : "s"}`);
	}
	if (c.models !== undefined) {
		parts.push(`${c.models} model${c.models === 1 ? "" : "s"}`);
	}
	if (c.hosts !== undefined) {
		parts.push(`${c.hosts} host${c.hosts === 1 ? "" : "s"}`);
	}
	return parts.length > 0 ? parts.join(" · ") : undefined;
}

function describeRef(ref: CatalogRef, index: PickerIndex): string {
	const providerLabel = ref.provider
		? (index.providersByName.get(ref.provider)?.displayName ?? ref.provider)
		: undefined;
	const hostLabel = ref.host
		? (index.hostsByName.get(ref.host)?.displayName ?? ref.host)
		: undefined;
	const modelLabel = (() => {
		if (!ref.model || !ref.provider) return undefined;
		const row = (index.modelsByProvider.get(ref.provider) ?? []).find(
			(m) => m.name === ref.model,
		);
		return row?.displayName ?? ref.model;
	})();

	switch (ref.kind) {
		case "provider":
			return `All ${providerLabel} models on every host`;
		case "provider-on-host":
			return `All ${providerLabel} models on ${hostLabel}`;
		case "model":
			return `${modelLabel} on any host`;
		case "binding":
			return `${modelLabel} on ${hostLabel}`;
		case "host":
			return `Every model served by ${hostLabel}`;
	}
}

function SelectionSummary({
	refs,
	index,
	includeDeprecated,
}: {
	refs: CatalogRef[];
	index: PickerIndex;
	includeDeprecated: boolean;
}) {
	return (
		<div className="border-t border-border bg-muted/30">
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					This policy grants
				</div>
				<div className="text-[10px] text-muted-foreground tabular-nums">
					{refs.length} {refs.length === 1 ? "grant" : "grants"}
				</div>
			</div>
			<ul className="divide-y divide-border/40">
				{refs.map((r) => {
					const meta = KIND_META[r.kind];
					const Icon = meta.icon;
					const counts = formatCounts(
						countsForRef(r, index, includeDeprecated),
					);
					return (
						<li key={r.raw} className="flex items-center gap-3 px-3 py-2">
							<span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
								<Icon className="w-3 h-3" />
							</span>
							<div className="min-w-0 flex-1">
								<div className="text-[12px] text-foreground leading-tight">
									{describeRef(r, index)}
								</div>
								<div className="flex items-center gap-2 mt-0.5">
									<code className="text-[10px] font-mono text-muted-foreground">
										{r.raw}
									</code>
									{counts && (
										<span className="text-[10px] text-muted-foreground tabular-nums">
											· {counts}
										</span>
									)}
								</div>
							</div>
							<span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 shrink-0">
								{meta.label}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function Empty({ label }: { label: string }) {
	return (
		<div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
			{label}
		</div>
	);
}

type CheckState = "off" | "on" | "indeterminate" | "covered";

function RowCheckbox({ state }: { state: CheckState }) {
	const base =
		"flex h-4 w-4 items-center justify-center rounded border shrink-0";
	if (state === "off")
		return <span className={`${base} border-input`} aria-hidden="true" />;
	if (state === "covered")
		return (
			<span
				className={`${base} bg-muted-foreground/30 border-muted-foreground/30 text-background`}
				aria-hidden="true"
			>
				<svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
					<title>covered</title>
					<path
						d="M2 6.5l2.5 2.5L10 3.5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					/>
				</svg>
			</span>
		);
	if (state === "indeterminate")
		return (
			<span
				className={`${base} bg-primary border-primary text-primary-foreground`}
				aria-hidden="true"
			>
				<span className="block h-0.5 w-2 bg-current rounded" />
			</span>
		);
	return (
		<span
			className={`${base} bg-primary border-primary text-primary-foreground`}
			aria-hidden="true"
		>
			<svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
				<title>checked</title>
				<path
					d="M2 6.5l2.5 2.5L10 3.5"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		</span>
	);
}
