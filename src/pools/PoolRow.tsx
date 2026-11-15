import { Link } from "@tanstack/react-router";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { HostCell } from "@/hosts/HostCell";
import { displayLabel } from "@/lib/displayLabel";
import { poolMemberSummary, SELECTION_LABELS } from "@/pools/poolKeys";
import type { PoolRow as PoolLine } from "@/pools/usePoolRows";
import { OwnerLink } from "@/projects/OwnerLink";
import { LineColumns, LineName, LineRow } from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";

// The tracks' minimums plus gaps come to 39rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,2fr)_minmax(9rem,1.2fr)_minmax(7rem,1fr)_minmax(6rem,0.8fr)_2rem]";

/** The table's column labels, on the rows' grid. */
export function PoolColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Host</span>
			<span>Selection</span>
			<span>Members</span>
			<span />
		</LineColumns>
	);
}

/** One pool: its host, how it picks a member, and what it holds. */
export function PoolRow({
	line,
	onDelete,
}: {
	line: PoolLine;
	onDelete: () => void;
}) {
	const { pool, host, hostLabel } = line;
	const name = pool.metadata.name;
	return (
		<LineRow cols={COLS}>
			<LineName
				slug={name}
				name={
					<Link
						to="/pools/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{displayLabel(pool.metadata)}
					</Link>
				}
			>
				<span className="shrink-0 empty:hidden">
					<OwnerLink owner={pool.metadata.owner} />
				</span>
				<PlanIssueDot kind="pool" id={pool.metadata.id} />
			</LineName>
			<span className="min-w-0">
				<HostCell host={host} fallbackLabel={hostLabel} size="sm" />
			</span>
			<span className="truncate">
				{SELECTION_LABELS[pool.spec.selection ?? "prioritized"].label}
			</span>
			<span className="truncate">{poolMemberSummary(pool)}</span>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: <Link to="/pools/$name/edit" params={{ name }} />,
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}
