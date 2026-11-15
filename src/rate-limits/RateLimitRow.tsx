import { Link } from "@tanstack/react-router";
import { useUpdateRateLimit } from "@/api/hooks/ratelimits";
import type { RateLimit } from "@/api/types/ratelimit";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { useSaveErrorToast } from "@/hooks/useSaveErrorToast";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { compactNumber } from "@/lib/rateLimitFormat";
import { windowShort } from "@/lib/timeWindow";
import { cn } from "@/lib/utils";
import {
	LineColumns,
	LineName,
	LineRow,
	NumberCell,
	QuietTag,
	SwitchCell,
} from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";
import { CatalogDetachedBadge } from "@/shared/StatusBadge";

// The tracks' minimums plus gaps come to 41.25rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(12rem,2fr)_minmax(6rem,0.8fr)_minmax(4rem,0.6fr)_minmax(10rem,1.6fr)_3.5rem_2rem]";

/** The table's column labels, on the rows' grid. */
export function RateLimitColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Strategy</span>
			<span className="text-right">Window</span>
			<span>Rules</span>
			<span className="pr-3 text-right">On</span>
			<span />
		</LineColumns>
	);
}

/** One rate limit: its first rule's strategy and window, and its rules. */
export function RateLimitRow({
	rl,
	onDelete,
}: {
	rl: RateLimit;
	onDelete: () => void;
}) {
	const updateRL = useUpdateRateLimit();
	const toastSaveError = useSaveErrorToast();
	const enabled = rl.spec.enabled !== false;
	const name = rl.metadata.name;
	const firstRule = rl.spec.rules?.[0];
	const strategy = firstRule?.strategy;
	async function toggleEnabled(next: boolean) {
		try {
			await updateRL.mutateAsync({
				id: rl.metadata.id ?? "",
				body: { metadata: rl.metadata, spec: { ...rl.spec, enabled: next } },
			});
		} catch (err) {
			toastSaveError(err, "Failed to update rate limit.");
		}
	}
	return (
		<LineRow cols={COLS} dimmed={!enabled}>
			<LineName
				slug={name}
				name={
					<Link
						to="/policies/rate-limits/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{displayLabel(rl.metadata)}
					</Link>
				}
			>
				{!hasDisplayName(rl.metadata) && <QuietTag>(no display name)</QuietTag>}
				<PlanIssueDot kind="ratelimit" id={rl.metadata.id} />
				<CatalogDetachedBadge detachedAt={rl.metadata.catalogDetachedAt} />
			</LineName>
			<span className={cn("truncate", strategy == null && "text-ink-3")}>
				{strategy ?? "—"}
			</span>
			<NumberCell value={firstRule ? windowShort(firstRule.window) : null} />
			<span className="truncate">{summarizeRules(rl)}</span>
			<SwitchCell
				checked={enabled}
				onChange={(next) => void toggleEnabled(next)}
				disabled={updateRL.isPending}
				label={`Toggle ${name}`}
			/>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: (
								<Link to="/policies/rate-limits/$name" params={{ name }} />
							),
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}

function summarizeRules(rl: RateLimit): string {
	const rules = rl.spec.rules ?? null;
	if (!rules || rules.length === 0) {
		return "—";
	}
	if (rules.length === 1) {
		return `${compactNumber(rules[0].amount)} ${rules[0].meter}`;
	}
	return `${rules.length} rules on ${rules
		.slice(0, 2)
		.map((r) => r.meter)
		.join(", ")}${rules.length > 2 ? " and more" : ""}`;
}
