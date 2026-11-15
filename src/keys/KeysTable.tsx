import { Link } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useDeleteKey } from "@/api/hooks/keys";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/filters/FilterBar";
import { toolbarMainActionClassName } from "@/filters/ToolbarActions";
import { KeyColumns, KeyRow } from "@/keys/KeyRow";
import { KEY_FILTERS, useKeysTable } from "@/keys/useKeysTable";
import { displayLabel } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { StaleContent } from "@/shared/StaleContent";
import { TableEmpty } from "@/shared/TableEmpty";
import { useConfirmedDelete } from "@/shared/useConfirmedDelete";

export function KeysTable() {
	const table = useKeysTable();
	const del = useConfirmedDelete(useDeleteKey(), { noun: "key" });

	return (
		<div>
			<FilterBar
				defs={KEY_FILTERS}
				state={table.filterState}
				onChange={table.patch}
				sort={table.sort}
				className="mb-3"
				actions={
					<Link to="/keys/new" className={toolbarMainActionClassName}>
						<Plus data-icon="inline-start" className="w-3.5 h-3.5" />
						New key
					</Link>
				}
			/>

			<StaleContent stale={table.isStale}>
				{table.lines.length === 0 ? (
					<TableEmpty icon={KeyRound}>
						{!table.filtered ? (
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
									<Plus data-icon="inline-start" className="w-4 h-4" />
									Create API key
								</Link>
							</>
						) : (
							<p className="text-sm text-muted-foreground">
								No keys match this filter.
							</p>
						)}
					</TableEmpty>
				) : (
					<div className="overflow-x-auto">
						<div className="grid min-w-[67.5rem] grid-cols-1">
							<KeyColumns />
							{table.lines.map((line) => (
								<KeyRow
									key={line.key.metadata.id ?? line.key.metadata.name}
									line={line}
									lastUsedLoaded={table.lastUsedLoaded}
									onDelete={() =>
										del.request({
											id: line.key.metadata.id ?? "",
											name: line.key.metadata.name,
											label: displayLabel(line.key.metadata),
										})
									}
								/>
							))}
						</div>
					</div>
				)}
			</StaleContent>
			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</div>
	);
}
