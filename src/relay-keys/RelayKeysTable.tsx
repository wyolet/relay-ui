import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { usePolicies } from "@/api/hooks/policies";
import {
	useDeleteRelayKey,
	useRelayKeys,
	useUpdateRelayKey,
} from "@/api/hooks/relayKeys";
import { ApiError } from "@/api/types/errors";
import type { RelayKey } from "@/api/types/relayKey";
import { Button, buttonVariants } from "@/components/ui/button";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useRelayKeyDiagnostics } from "@/diagnostics/useDiagnostics";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { confirm } from "@/shared/ConfirmDialog";
import { RowMenu } from "@/shared/RowMenu";
import { SearchBox } from "@/shared/SearchBox";
import { Switch } from "@/shared/Switch";
import { TableToolbar } from "@/shared/TableToolbar";
import { Th } from "@/shared/Th";
import { toast } from "@/shared/Toast";

function RelayKeyDiagDot({ id }: { id: string | undefined }) {
	const diagnostics = useRelayKeyDiagnostics(id);
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

function relayStatus(rk: RelayKey): { tone: StatusTone; label: string } {
	if (rk.spec.enabled === false) return { tone: "warn", label: "Disabled" };
	return { tone: "active", label: "Active" };
}

export function RelayKeysTable() {
	const navigate = useNavigate({ from: "/keys" });
	const search = useSearch({ from: "/_authenticated/keys" });
	const { data: relayKeysData } = useRelayKeys();
	const { data: policiesData } = usePolicies();
	const updateRelayKey = useUpdateRelayKey();
	const deleteRelayKey = useDeleteRelayKey();

	const policyLabels = new Map<string, string>();
	for (const p of policiesData.items ?? []) {
		if (p.metadata.id)
			policyLabels.set(p.metadata.id, displayLabel(p.metadata));
	}

	const allItems = relayKeysData.items ?? [];
	const needle = search.q.trim().toLowerCase();
	const items = needle
		? allItems.filter(
				(rk) =>
					displayLabel(rk.metadata).toLowerCase().includes(needle) ||
					rk.metadata.name.toLowerCase().includes(needle) ||
					(rk.spec.prefix ?? "").toLowerCase().includes(needle),
			)
		: allItems;

	function setQ(q: string) {
		void navigate({ search: (prev) => ({ ...prev, q }), replace: true });
	}

	async function handleToggleEnabled(rk: RelayKey, nextEnabled: boolean) {
		try {
			await updateRelayKey.mutateAsync({
				id: rk.metadata.id ?? "",
				body: {
					metadata: rk.metadata,
					spec: { ...rk.spec, enabled: nextEnabled },
				},
			});
			toast(
				"success",
				`Relay key "${displayLabel(rk.metadata)}" ${nextEnabled ? "enabled" : "disabled"}.`,
			);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update relay key.",
			);
		}
	}

	async function handleDelete(rk: RelayKey) {
		const ok = await confirm({
			title: `Delete ${displayLabel(rk.metadata)}?`,
			description: "Apps using this key will start returning 401.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteRelayKey.mutateAsync(rk.metadata.id ?? "");
			toast("success", `Relay key "${displayLabel(rk.metadata)}" deleted.`);
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to delete relay key.",
			);
		}
	}

	return (
		<div>
			<TableToolbar
				search={
					<SearchBox
						value={search.q}
						onChange={setQ}
						placeholder="Search keys"
					/>
				}
				actions={
					<Link
						to="/relay-keys/new"
						className={buttonVariants({ variant: "cta", size: "lg" })}
					>
						<Plus className="w-3.5 h-3.5" />
						New key
					</Link>
				}
			/>

			{items.length === 0 ? (
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
					<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
					{allItems.length === 0 ? (
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
								to="/relay-keys/new"
								className={buttonVariants({ variant: "cta", size: "lg" })}
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
								<Th variant="column">Policy</Th>
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
													to="/relay-keys/$name"
													params={{ name: rk.metadata.name }}
													className="text-sm font-medium text-foreground hover:underline"
												>
													{displayLabel(rk.metadata)}
												</Link>
												<RelayKeyDiagDot id={rk.metadata.id} />
											</div>
											{hasDisplayName(rk.metadata) && (
												<div className="font-mono text-[11px] text-muted-foreground">
													{rk.metadata.name}
												</div>
											)}
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
											{policyLabel}
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
																to="/relay-keys/$name/edit"
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
