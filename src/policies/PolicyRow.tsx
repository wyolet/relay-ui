import { Link } from "@tanstack/react-router";
import type { Policy } from "@/api/types/policy";
import type { RateLimit } from "@/api/types/ratelimit";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import { useMutability } from "@/hooks/useMutability";
import { displayLabel } from "@/lib/displayLabel";
import { useTogglePolicyEnabled } from "@/policies/useTogglePolicyEnabled";
import { OwnerLink } from "@/projects/OwnerLink";
import {
	LineColumns,
	LineName,
	LineRow,
	NumberCell,
	QuietTag,
	SwitchCell,
} from "@/shared/LineGrid";
import { type MenuAction, RowMenu } from "@/shared/RowMenu";
import { CatalogDetachedBadge } from "@/shared/StatusBadge";

// The tracks' minimums plus gaps come to 57rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(13rem,2fr)_minmax(6rem,0.9fr)_minmax(6rem,0.8fr)_minmax(3.5rem,0.4fr)_minmax(8rem,1.1fr)_minmax(4rem,0.5fr)_3.5rem_2rem]";
export const POLICY_MIN_W = "min-w-[57rem]";

/** The table's column labels, on the rows' grid. */
export function PolicyColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Applies to</span>
			<span>Models</span>
			<span className="text-right">Pools</span>
			<span>Rate limits</span>
			<span className="text-right">Budgets</span>
			<span className="pr-3 text-right">On</span>
			<span />
		</LineColumns>
	);
}

/** What the policy lets through, in a word: everything, or its grant count. */
function modelsText(policy: Policy): { text: string; all: boolean } {
	const n = (policy.spec.models ?? []).length;
	return n === 0
		? { text: "All available", all: true }
		: { text: `${n} grant${n === 1 ? "" : "s"}`, all: false };
}

/** One policy: who runs under it, what it bundles, and its switch. */
export function PolicyRow({
	policy,
	appliesTo,
	rateLimitById,
	onDelete,
}: {
	policy: Policy;
	/** Accounts bound to the policy; undefined while loading. */
	appliesTo: number | undefined;
	rateLimitById: ReadonlyMap<string, RateLimit>;
	onDelete: () => void;
}) {
	const { setEnabled } = useTogglePolicyEnabled();
	const { canEdit, canDelete } = useMutability(policy.metadata, "policy");
	const enabled = policy.spec.enabled !== false;
	const label = displayLabel(policy.metadata);
	const name = policy.metadata.name;
	const models = modelsText(policy);
	const rateLimitLinks = policy.spec.rateLimits ?? [];
	const onlyRateLimit =
		rateLimitLinks.length === 1 && rateLimitLinks[0]
			? rateLimitById.get(rateLimitLinks[0].rateLimitId)
			: undefined;
	const actions: MenuAction[] = [];
	if (canEdit) {
		actions.push({
			label: "Edit",
			// The detail page, as before: editing a shared policy is guarded there.
			render: <Link to="/policies/$name" params={{ name }} />,
		});
	}
	if (canDelete)
		actions.push({ label: "Delete", danger: true, onClick: onDelete });

	return (
		<LineRow cols={COLS} dimmed={!enabled}>
			<LineName
				slug={name}
				name={
					<Link
						to="/policies/$name"
						params={{ name }}
						className="truncate text-foreground hover:underline"
					>
						{label}
					</Link>
				}
			>
				<span className="shrink-0 empty:hidden">
					<OwnerLink owner={policy.metadata.owner} />
				</span>
				<CatalogDetachedBadge detachedAt={policy.metadata.catalogDetachedAt} />
				<PlanIssueDot kind="policy" id={policy.metadata.id} />
			</LineName>
			<span className="truncate">
				{appliesTo === undefined ? (
					<span className="text-ink-3">…</span>
				) : appliesTo === 0 ? (
					<span
						className="text-warning"
						title="No account runs under this policy, so no request uses it."
					>
						No one
					</span>
				) : (
					`${appliesTo} account${appliesTo === 1 ? "" : "s"}`
				)}
			</span>
			<span className={models.all ? "truncate text-ink-3" : "truncate"}>
				{models.text}
			</span>
			<NumberCell value={String((policy.spec.poolIds ?? []).length)} />
			<span className="min-w-0 truncate">
				{onlyRateLimit ? (
					<Link
						to="/policies/rate-limits/$name"
						params={{ name: onlyRateLimit.metadata.name }}
						className="text-foreground hover:underline"
					>
						{displayLabel(onlyRateLimit.metadata)}
					</Link>
				) : rateLimitLinks.length > 0 ? (
					`${rateLimitLinks.length} rate limits`
				) : (
					<span className="text-ink-3">—</span>
				)}
			</span>
			<NumberCell value={String((policy.spec.budgets ?? []).length)} />
			{canEdit ? (
				<SwitchCell
					checked={enabled}
					onChange={(next) => setEnabled(policy, next)}
					label={`${enabled ? "Disable" : "Enable"} ${label}`}
				/>
			) : (
				<span
					className="pr-3 text-right"
					title="Host-owned: toggle the host or model instead"
				>
					<QuietTag>{enabled ? "on" : "off"}</QuietTag>
				</span>
			)}
			<span className="flex justify-end">
				{actions.length > 0 ? (
					<RowMenu actions={actions} />
				) : (
					<QuietTag title="Host-owned: managed by Relay">managed</QuietTag>
				)}
			</span>
		</LineRow>
	);
}
