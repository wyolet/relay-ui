import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useUpdateHost } from "@/api/hooks/hosts";
import { ApiError } from "@/api/types/errors";
import type { Host } from "@/api/types/host";
import { DiagnosticDot } from "@/diagnostics/DiagnosticDot";
import { useHostDiagnostics } from "@/diagnostics/useDiagnostics";
import { HostCell } from "@/hosts/HostCell";
import { useHostReferences } from "@/hosts/useHostReferences";
import { displayLabel } from "@/lib/displayLabel";
import { Switch } from "@/shared/Switch";
import { toast } from "@/shared/Toast";

export type HostsSortKey = "name";
export type HostsSortDir = "asc" | "desc";

function sortValue(h: Host, _key: HostsSortKey): string {
	return displayLabel(h.metadata).toLowerCase();
}

export function applyHostFilter(items: Host[], q: string): Host[] {
	const ql = q.trim().toLowerCase();
	if (!ql) return items;
	return items.filter((h) => {
		const hay = [
			h.metadata.name,
			h.metadata.displayName,
			h.spec.baseURL,
			h.spec.consoleURL,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return hay.includes(ql);
	});
}

export function applyHostSort(
	items: Host[],
	key: HostsSortKey,
	dir: HostsSortDir,
): Host[] {
	const sorted = [...items].sort((a, b) =>
		sortValue(a, key).localeCompare(sortValue(b, key), undefined, {
			numeric: true,
		}),
	);
	return dir === "asc" ? sorted : sorted.reverse();
}

interface SortHeaderProps {
	label: string;
	field: HostsSortKey;
	current: HostsSortKey;
	dir: HostsSortDir;
	onClick: (field: HostsSortKey) => void;
}

function SortHeader({ label, field, current, dir, onClick }: SortHeaderProps) {
	const active = current === field;
	const Icon = dir === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
		>
			<button
				type="button"
				onClick={() => onClick(field)}
				className={[
					"inline-flex items-center gap-1 transition-colors",
					active ? "text-foreground" : "hover:text-foreground",
				].join(" ")}
			>
				{label}
				{active && <Icon className="w-3 h-3" aria-hidden="true" />}
			</button>
		</th>
	);
}

function HostRow({ h }: { h: Host }) {
	const enabled = h.spec.enabled !== false;
	const update = useUpdateHost();
	const diagnostics = useHostDiagnostics(h.metadata.id);
	const refs = useHostReferences(h);
	const enabledModels = refs.enabledModels.length;
	const enabledKeys = refs.hostKeys.filter(
		(hk) => hk.spec.enabled !== false,
	).length;

	async function toggle(next: boolean) {
		try {
			await update.mutateAsync({
				id: h.metadata.id ?? "",
				body: { metadata: h.metadata, spec: { ...h.spec, enabled: next } },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to update host.",
			);
		}
	}

	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/hosts/$name"
					params={{ name: h.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<HostCell
						host={h}
						accessory={<DiagnosticDot diagnostics={diagnostics} />}
					/>
				</Link>
			</td>
			<CountCell total={refs.models.length} enabled={enabledModels} />
			<CountCell total={refs.hostKeys.length} enabled={enabledKeys} />
			<CountCell total={refs.hostPolicies.length} />
			<CountCell total={refs.userPolicies.length} />
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={() => void toggle(!enabled)}
					label={`Toggle ${h.metadata.name}`}
				/>
			</td>
		</tr>
	);
}

function CountTh({ label }: { label: string }) {
	return (
		<th
			scope="col"
			className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
		>
			{label}
		</th>
	);
}

function CountCell({ total, enabled }: { total: number; enabled?: number }) {
	return (
		<td className="px-3 py-2 text-right tabular-nums">
			{total === 0 ? (
				<span className="text-[11px] text-muted-foreground/70">—</span>
			) : enabled !== undefined && enabled < total ? (
				<span className="text-xs text-foreground">
					<span className="font-medium">{enabled}</span>
					<span className="text-muted-foreground"> / {total}</span>
				</span>
			) : (
				<span className="text-xs text-foreground font-medium">{total}</span>
			)}
		</td>
	);
}

interface HostsTableProps {
	items: Host[];
	sort: HostsSortKey;
	dir: HostsSortDir;
	onSort: (field: HostsSortKey) => void;
}

export function HostsTable({ items, sort, dir, onSort }: HostsTableProps) {
	return (
		<div className="overflow-x-auto rounded-lg border border-border bg-card">
			<table className="w-full border-collapse">
				<thead className="bg-muted/40">
					<tr>
						<SortHeader
							label="Name"
							field="name"
							current={sort}
							dir={dir}
							onClick={onSort}
						/>
						<CountTh label="Models" />
						<CountTh label="Host keys" />
						<CountTh label="Host policies" />
						<CountTh label="User policies" />
						<th
							scope="col"
							className="w-12 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
						>
							On
						</th>
					</tr>
				</thead>
				<tbody>
					{items.map((h) => (
						<HostRow key={h.metadata.name} h={h} />
					))}
				</tbody>
			</table>
		</div>
	);
}
