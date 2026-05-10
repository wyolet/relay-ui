import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export interface ColumnDef<T> {
	key: string;
	label: string;
	render: (row: T) => string | number | null | undefined;
	sortable?: boolean;
}

interface ResourceListProps<T> {
	title: string;
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
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-bold text-foreground">{title}</h1>
				<Link
					to={createTo}
					className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
				>
					+ Create new
				</Link>
			</div>

			<div className="mb-4">
				<input
					type="search"
					placeholder="Search by name…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full max-w-sm border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
				/>
			</div>

			{sorted.length === 0 ? (
				<div className="text-center py-16 text-muted-foreground text-sm">
					{search ? (
						<p>No results for "{search}"</p>
					) : (
						<>
							<p className="mb-4">{emptyMessage}</p>
							<Link
								to={createTo}
								className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
							>
								Create your first
							</Link>
						</>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-border">
					<table className="w-full text-sm">
						<thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
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
												{col.render(row) ?? (
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
