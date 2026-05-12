import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SearchBox } from "@/components/SearchBox";
import { TableToolbar } from "@/components/TableToolbar";

export interface ColumnDef<T> {
	key: string;
	label: string;
	render: (row: T) => string | number | null | undefined;
	/** Optional: render JSX for the table cell. Falls back to `render` if omitted. Does not affect sorting. */
	renderCell?: (row: T) => React.ReactNode;
	sortable?: boolean;
}

interface ResourceListProps<T> {
	title?: string;
	items: T[];
	columns: ColumnDef<T>[];
	/** Route path prefix — detail is `${basePath}/$name`, create is `${basePath}/new` */
	createTo: string;
	detailTo: (name: string) => string;
	/** Extract the resource name from a row (used for search, navigation, and row key). */
	getName: (row: T) => string;
	emptyMessage?: string;
}

type SortDir = "asc" | "desc";

export function ResourceList<T>({
	title,
	items,
	columns,
	createTo,
	detailTo,
	getName,
	emptyMessage = "No items yet.",
}: ResourceListProps<T>) {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<string>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const colByKey: Record<string, ColumnDef<T>> = {};
	for (const col of columns) {
		colByKey[col.key] = col;
	}

	const filtered = items.filter((item) =>
		getName(item).toLowerCase().includes(search.toLowerCase()),
	);

	const sorted = [...filtered].sort((a, b) => {
		const col = colByKey[sortKey];
		const av = col ? col.render(a) : getName(a);
		const bv = col ? col.render(b) : getName(b);
		const aStr = av === null || av === undefined ? "" : String(av);
		const bStr = bv === null || bv === undefined ? "" : String(bv);
		const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
		return sortDir === "asc" ? cmp : -cmp;
	});

	function toggleSort(key: string) {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	}

	return (
		<div>
			{title && (
				<h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
			)}
			<TableToolbar
				search={
					<SearchBox
						value={search}
						onChange={setSearch}
						placeholder="Search by name…"
					/>
				}
				actions={
					<Link
						to={createTo}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Plus className="w-3.5 h-3.5" />
						Create new
					</Link>
				}
			/>

			{sorted.length === 0 ? (
				<div className="text-center py-16 text-muted-foreground text-sm">
					{search ? (
						<p>No results for "{search}"</p>
					) : (
						<>
							<p className="mb-4">{emptyMessage}</p>
							<Link
								to={createTo}
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-sm font-semibold text-white transition-colors"
							>
								Create your first
							</Link>
						</>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border">
					<table className="w-full text-sm">
						<thead className="bg-muted/40 border-b border-border">
							<tr>
								{columns.map((col) => (
									<th
										key={col.key}
										scope="col"
										className={[
											"px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none",
											col.sortable !== false
												? "cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-200"
												: "",
										].join(" ")}
										onClick={
											col.sortable !== false
												? () => toggleSort(col.key)
												: undefined
										}
									>
										{col.label}
										{sortKey === col.key && (
											<span className="ml-1">
												{sortDir === "asc" ? "↑" : "↓"}
											</span>
										)}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{sorted.map((row) => {
								const rowName = getName(row);
								return (
									<tr
										key={rowName}
										onClick={() => void navigate({ to: detailTo(rowName) })}
										className="hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors bg-card"
									>
										{columns.map((col) => (
											<td key={col.key} className="px-4 py-3 text-foreground">
												{(col.renderCell ? col.renderCell(row) : col.render(row)) ?? (
													<span className="text-muted-foreground">—</span>
												)}
											</td>
										))}
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
