import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import {
	type KeysListParams,
	useDeleteKey,
	useKeysList,
	useUpdateKey,
} from "@/api/hooks/keys";
import { usePolicies } from "@/api/hooks/policies";
import { useServiceAccounts } from "@/api/hooks/serviceAccounts";
import { ApiError } from "@/api/types/errors";
import type { Key } from "@/api/types/key";
import { Button, buttonVariants } from "@/components/ui/button";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { FilterBar } from "@/filters/FilterBar";
import { activeFilterCount } from "@/filters/toQueryParams";
import type { FilterDef, FilterState } from "@/filters/types";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { OwnerLink } from "@/projects/OwnerLink";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

function KeyDiagDot({ id }: { id: string | undefined }) {
	const diagnostics = useKeyDiagnostics(id);
	return <DiagnosticDot diagnostics={diagnostics} />;
}

type StatusTone = "active" | "muted" | "danger" | "warn";

function StatusDot({ tone, label }: { tone: StatusTone; label: string }) {
	const cls = {
		active:
			"bg-success shadow-[0_0_6px_color-mix(in_oklab,var(--success)_70%,transparent)]",
		muted: "bg-neutral-400 dark:bg-neutral-600",
		danger:
			"bg-destructive shadow-[0_0_6px_color-mix(in_oklab,var(--destructive)_70%,transparent)]",
		warn: "bg-warning shadow-[0_0_6px_color-mix(in_oklab,var(--warning)_70%,transparent)]",
	}[tone];
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={`inline-block w-2 h-2 rounded-full ${cls}`}
		/>
	);
}

function PrefixCell({ text, copyText }: { text: string; copyText: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(copyText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_200);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onClick={() => void handleCopy()}
			title="Copy prefix"
			className="gap-1.5 bg-muted px-1.5 font-mono text-[11px] font-normal text-muted-foreground hover:bg-muted/60"
		>
			<span>{text}</span>
			{copied ? (
				<Check className="w-3 h-3 text-primary" />
			) : (
				<Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
			)}
		</Button>
	);
}

function relayStatus(rk: Key): { tone: StatusTone; label: string } {
	if (rk.spec.enabled === false) return { tone: "warn", label: "Disabled" };
	if (rk.spec.revokedAt) return { tone: "danger", label: "Revoked" };
	if (rk.spec.expiresAt && Date.parse(rk.spec.expiresAt) < Date.now())
		return { tone: "danger", label: "Expired" };
	return { tone: "active", label: "Active" };
}

/** Filters rendered above the table, all served by GET /keys. */
export const KEY_FILTERS = [
	{
		key: "q",
		type: "search",
		label: "Search",
		placeholder: "Search keys",
		default: "",
	},
	{
		key: "principal_kind",
		type: "select",
		label: "Principal",
		default: "all",
		options: [
			{ value: "all", label: "Any principal" },
			{ value: "serviceaccount", label: "Service accounts" },
			{ value: "user", label: "Users" },
		],
	},
	{
		key: "expired",
		type: "select",
		label: "Expiry",
		default: "all",
		options: [
			{ value: "all", label: "Any expiry" },
			{ value: "false", label: "Not expired" },
			{ value: "true", label: "Expired" },
		],
	},
] as const satisfies readonly FilterDef[];

/** Map the route's filter state onto GET /keys query params. */
export function toKeysParams(search: {
	q: string;
	principal_kind: "all" | "serviceaccount" | "user";
	principal_id: string;
	expired: "all" | "true" | "false";
}): KeysListParams {
	const params: KeysListParams = {};
	const q = search.q.trim();
	if (q) params.q = q;
	if (search.principal_kind !== "all")
		params.principal_kind = [search.principal_kind];
	if (search.principal_id) params.principal_id = [search.principal_id];
	if (search.expired !== "all") params.expired = search.expired === "true";
	return params;
}

export function KeysTable() {
	const navigate = useNavigate({ from: "/keys" });
	const search = useSearch({ from: "/_authenticated/keys" });
	const { data: keysData } = useKeysList(toKeysParams(search));
	const { data: accountsData } = useServiceAccounts();
	const { data: policiesData } = usePolicies();
	const updateKey = useUpdateKey();
	const deleteKey = useDeleteKey();

	const policyLabels = new Map<string, string>();
	for (const p of policiesData.items ?? []) {
		if (p.metadata.id)
			policyLabels.set(p.metadata.id, displayLabel(p.metadata));
	}

	const accountLabels = new Map<string, string>();
	for (const sa of accountsData.items ?? []) {
		if (sa.metadata.id)
			accountLabels.set(sa.metadata.id, displayLabel(sa.metadata));
	}

	// Server-filtered: render as-is.
	const items = keysData.items ?? [];
	const filtered = activeFilterCount(KEY_FILTERS, { ...search }) > 0;

	function patch(next: FilterState) {
		void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
	}

	async function handleToggleEnabled(rk: Key, nextEnabled: boolean) {
		try {
			await updateKey.mutateAsync({
				id: rk.metadata.id ?? "",
				body: {
					metadata: rk.metadata,
					spec: { ...rk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Key "${displayLabel(rk.metadata)}" ${nextEnabled ? "enabled" : "disabled"}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update key.",
			);
		}
	}

	async function handleDelete(rk: Key) {
		const ok = await confirm({
			title: `Delete ${displayLabel(rk.metadata)}?`,
			description: "Apps using this key will start returning 401.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteKey.mutateAsync(rk.metadata.id ?? "");
			toast("success", `Key "${displayLabel(rk.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete key.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<FilterBar
						defs={KEY_FILTERS}
						state={{
							q: search.q,
							principal_kind: search.principal_kind,
							expired: search.expired,
						}}
						onChange={patch}
					/>
				}
				actions={
					<Link
						to="/keys/new"
						className={buttonVariants({ variant: "default", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New key
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{!filtered ? (
						<>
							<p className="text-sm font-medium text-foreground mb-1">
								Create your first API key
							</p>
							<p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
								Requests to the relay authenticate with this key — send it as{" "}
								<code className="font-mono text-[11px] text-foreground bg-muted px-1 py-0.5 rounded">
									Authorization: Bearer {"<key>"}
								</code>
								.
							</p>
							<Link
								to="/keys/new"
								className={buttonVariants({ variant: "default", size: "lg" })}
							>
								<Plus className="w-4 h-4" />
								Create API key
							</Link>
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							No keys match this filter.
						</p>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border bg-card">
					<table className="w-full border-collapse">
						<thead className="bg-muted/40">
							<tr>
								<th scope="col" className="w-6 px-3 py-2" aria-label="Status" />
								<Th variant="column">Name</Th>
								<Th variant="column">Prefix</Th>
								<Th variant="column">Principal</Th>
								<Th variant="column">Policy</Th>
								<Th variant="column">Expires</Th>
								<Th variant="column">Passthrough</Th>
								<th
									scope="col"
									className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									On
								</th>
								<th
									scope="col"
									className="w-10 px-3 py-2"
									aria-label="Actions"
								/>
							</tr>
						</thead>
						<tbody>
							{items.map((rk) => {
								const status = relayStatus(rk);
								const enabled = rk.spec.enabled ?? true;
								const pid = rk.spec.policyId ?? "";
								const policyLabel = pid
									? (policyLabels.get(pid) ?? `Unknown (${pid.slice(0, 6)}…)`)
									: "—";
								return (
									<tr
										key={rk.metadata.name}
										className={[
											"border-t border-border transition-colors",
											enabled
												? "hover:bg-muted/40"
												: "bg-muted/30 text-muted-foreground/70",
										].join(" ")}
									>
										<td className="px-3 py-2 align-middle">
											<StatusDot tone={status.tone} label={status.label} />
										</td>
										<td className="px-3 py-2">
											<div className="flex items-center gap-2">
												<Link
													to="/keys/$name"
													params={{ name: rk.metadata.name }}
													className="text-sm font-medium text-foreground hover:underline"
												>
													{displayLabel(rk.metadata)}
												</Link>
												<KeyDiagDot id={rk.metadata.id} />
											</div>
											{hasDisplayName(rk.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{rk.metadata.name}
												</div>
											)}
											<div className="mt-1 empty:hidden">
												<OwnerLink owner={rk.metadata.owner} />
											</div>
										</td>
										<td className="px-3 py-2">
											{rk.spec.prefix ? (
												<PrefixCell
													text={`${rk.spec.prefix}…`}
													copyText={rk.spec.prefix}
												/>
											) : (
												<span className="text-[11px] text-muted-foreground/70">
													—
												</span>
											)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{rk.spec.principal.kind === "user"
												? "User"
												: (accountLabels.get(rk.spec.principal.id) ??
													`Service account (${rk.spec.principal.id.slice(0, 6)}…)`)}
										</td>
										<td className="px-3 py-2 text-xs text-foreground">
											{policyLabel}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											{rk.spec.expiresAt
												? new Date(rk.spec.expiresAt).toLocaleDateString()
												: "—"}
										</td>
										<td className="px-3 py-2 text-xs text-muted-foreground">
											{rk.spec.passthroughAllowed ? "Allowed" : "—"}
										</td>
										<td className="px-3 py-2">
											<Switch
												checked={enabled}
												onChange={(next) => void handleToggleEnabled(rk, next)}
												label={`Toggle ${rk.metadata.name}`}
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<RowMenu
												actions={[
													{
														label: "Edit",
														render: (
															<Link
																to="/keys/$name/edit"
																params={{ name: rk.metadata.name }}
															/>
														),
													},
													{
														label: "Delete",
														danger: true,
														onClick: () => void handleDelete(rk),
													},
												]}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
