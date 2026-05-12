import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import type { Provider } from "@/api/types/provider";
import { Switch } from "@/components/Switch";
import { toast } from "@/components/Toast";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";

export type ProvidersSortKey = "name" | "kind" | "baseURL" | "default";
export type ProvidersSortDir = "asc" | "desc";

function sortValue(p: Provider, key: ProvidersSortKey): string | number {
	switch (key) {
		case "name":
			return displayLabel(p.metadata).toLowerCase();
		case "kind":
			return p.spec.kind.toLowerCase();
		case "baseURL":
			return p.spec.baseURL.toLowerCase();
		case "default":
			return p.spec.default ? 1 : 0;
	}
}

export function applyProviderFilter(items: Provider[], q: string): Provider[] {
	const ql = q.trim().toLowerCase();
	if (!ql) return items;
	return items.filter((p) => {
		const hay = [
			p.metadata.name,
			p.metadata.displayName,
			p.spec.kind,
			p.spec.baseURL,
			p.spec.description,
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return hay.includes(ql);
	});
}

export function applyProviderSort(
	items: Provider[],
	key: ProvidersSortKey,
	dir: ProvidersSortDir,
): Provider[] {
	const sorted = [...items].sort((a, b) => {
		const av = sortValue(a, key);
		const bv = sortValue(b, key);
		if (typeof av === "number" && typeof bv === "number") return av - bv;
		return String(av).localeCompare(String(bv), undefined, { numeric: true });
	});
	return dir === "asc" ? sorted : sorted.reverse();
}

interface SortHeaderProps {
	label: string;
	field: ProvidersSortKey;
	current: ProvidersSortKey;
	dir: ProvidersSortDir;
	onClick: (field: ProvidersSortKey) => void;
	align?: "left" | "right";
}

function SortHeader({
	label,
	field,
	current,
	dir,
	onClick,
	align = "left",
}: SortHeaderProps) {
	const active = current === field;
	const Icon = dir === "asc" ? ArrowUp : ArrowDown;
	return (
		<th
			scope="col"
			className={[
				"px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
				align === "right" ? "text-right" : "text-left",
			].join(" ")}
		>
			<button
				type="button"
				onClick={() => onClick(field)}
				className={[
					"inline-flex items-center gap-1 transition-colors",
					align === "right" ? "flex-row-reverse" : "",
					active ? "text-foreground" : "hover:text-foreground",
				].join(" ")}
			>
				{label}
				{active && <Icon className="w-3 h-3" aria-hidden="true" />}
			</button>
		</th>
	);
}

function RowMenu({ name }: { name: string }) {
	const navigate = useNavigate();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Provider actions"
				className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<MoreHorizontal className="w-3.5 h-3.5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-[160px]">
				<DropdownMenuItem
					onClick={() =>
						navigate({ to: "/providers/$name/edit", params: { name } })
					}
				>
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onClick={() => toast("success", "Delete provider — coming soon.")}
				>
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ProviderRow({ p }: { p: Provider }) {
	const enabled = p.spec.enabled !== false;
	return (
		<tr className="border-t border-border hover:bg-muted/40 transition-colors">
			<td className="px-3 py-2">
				<Link
					to="/providers/$name"
					params={{ name: p.metadata.name }}
					className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
				>
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm font-medium text-foreground truncate">
							{displayLabel(p.metadata)}
						</span>
						{!hasDisplayName(p.metadata) && (
							<span className="text-[11px] text-muted-foreground">
								(no display name)
							</span>
						)}
					</div>
					{hasDisplayName(p.metadata) && (
						<div className="text-[11px] text-muted-foreground truncate">
							<code className="font-mono">{p.metadata.name}</code>
						</div>
					)}
				</Link>
			</td>
			<td className="px-3 py-2 text-sm text-foreground capitalize">
				{p.spec.kind}
			</td>
			<td className="px-3 py-2 text-sm text-foreground">
				<code className="font-mono text-xs">{p.spec.baseURL}</code>
			</td>
			<td className="px-3 py-2 text-sm text-foreground">
				{p.spec.default ? "Yes" : "—"}
			</td>
			<td className="px-3 py-2">
				<Switch
					checked={enabled}
					onChange={() =>
						toast(
							"success",
							"Provider enable/disable — backend support coming soon.",
						)
					}
					label={`Toggle ${p.metadata.name}`}
				/>
			</td>
			<td className="px-3 py-2 text-right">
				<RowMenu name={p.metadata.name} />
			</td>
		</tr>
	);
}

interface ProvidersTableProps {
	items: Provider[];
	sort: ProvidersSortKey;
	dir: ProvidersSortDir;
	onSort: (field: ProvidersSortKey) => void;
}

export function ProvidersTable({
	items,
	sort,
	dir,
	onSort,
}: ProvidersTableProps) {
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
							label="Kind"
							field="kind"
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
						<SortHeader
							label="Default"
							field="default"
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
						<th scope="col" className="w-10 px-3 py-2" aria-label="Actions" />
					</tr>
				</thead>
				<tbody>
					{items.map((p) => (
						<ProviderRow key={p.metadata.name} p={p} />
					))}
				</tbody>
			</table>
		</div>
	);
}
