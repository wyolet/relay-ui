import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export interface ColumnDef<T> {
	key: string;
	label: string;
	render: (row: T) => string | number | null | undefined;
	sortable?: boolean;
}

interface ResourceListProps<T extends { name: string }> {
	title: string;
	items: T[];
	columns: ColumnDef<T>[];
	/** Route path prefix — detail is `${basePath}/$name`, create is `${basePath}/new` */
	createTo: string;
	detailTo: (name: string) => string;
	emptyMessage?: string;
}

type SortDir = "asc" | "desc";

export function ResourceList<T extends { name: string }>({
	title,
	items,
	columns,
	createTo,
	detailTo,
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
		item.name.toLowerCase().includes(search.toLowerCase()),
	);

	const sorted = [...filtered].sort((a, b) => {
		const col = colByKey[sortKey];
		const av = col ? col.render(a) : a.name;
		const bv = col ? col.render(b) : b.name;
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
				<h1 className="text-2xl font-bold text-gray-900">{title}</h1>
				<Link
					to={createTo}
					className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
					className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
				/>
			</div>

			{sorted.length === 0 ? (
				<div className="text-center py-16 text-gray-500 text-sm">
					{search ? (
						<p>No results for "{search}"</p>
					) : (
						<>
							<p className="mb-4">{emptyMessage}</p>
							<Link
								to={createTo}
								className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
							>
								Create your first
							</Link>
						</>
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border border-gray-200">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 border-b border-gray-200">
							<tr>
								{columns.map((col) => (
									<th
										key={col.key}
										scope="col"
										className={[
											"px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none",
											col.sortable !== false
												? "cursor-pointer hover:text-gray-800"
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
						<tbody className="divide-y divide-gray-100">
							{sorted.map((row) => (
								<tr
									key={row.name}
									onClick={() => void navigate({ to: detailTo(row.name) })}
									className="hover:bg-gray-50 cursor-pointer transition-colors"
								>
									{columns.map((col) => (
										<td key={col.key} className="px-4 py-3 text-gray-900">
											{col.render(row) ?? (
												<span className="text-gray-400">—</span>
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
