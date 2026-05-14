import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useUpdateHost } from "@/api/hooks/hosts";
import type { Host } from "@/api/types/host";
import { ApiError } from "@/api/types/errors";
import { Switch } from "@/components/Switch";
import { toast } from "@/components/Toast";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

export type HostsSortKey = "name" | "baseURL";
export type HostsSortDir = "asc" | "desc";

function sortValue(h: Host, key: HostsSortKey): string {
	switch (key) {
		case "name":
			return displayLabel(h.metadata).toLowerCase();
		case "baseURL":
			return h.spec.baseURL.toLowerCase();
	}
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

function SortHeader({
	label,
	field,
	current,
	dir,
	onClick,
}: SortHeaderProps) {
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
	const update = useUpdateHost(h.metadata.id ?? "");

	async function toggle(next: boolean) {
		try {
			await update.mutateAsync({
				metadata: h.metadata,
				spec: { ...h.spec, enabled: next },
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
					to="/models"
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm font-medium text-foreground truncate">
							{displayLabel(h.metadata)}
						</span>
						{!hasDisplayName(h.metadata) && (
							<span className="text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
					</div>
					{hasDisplayName(h.metadata) && (
						<div className="text-[11px] text-muted-foreground truncate">
							<code className="font-mono">{h.metadata.name}</code>
						</div>
					)}
				</Link>
			</td>
			<td className="px-3 py-2 text-sm text-foreground">
				<code className="font-mono text-xs">{h.spec.baseURL}</code>
			</td>
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
						<SortHeader
							label="Base URL"
							field="baseURL"
							current={sort}
							dir={dir}
							onClick={onSort}
						/>
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
