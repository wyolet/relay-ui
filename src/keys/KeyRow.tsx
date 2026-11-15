import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PlanIssueDot } from "@/diagnostics/DiagnosticDot";
import type { KeyTableLine } from "@/keys/useKeysTable";
import { useToggleKeyEnabled } from "@/keys/useToggleKeyEnabled";
import { displayLabel } from "@/lib/displayLabel";
import { fmtAgo, fmtCompact, fmtTs } from "@/lib/format";
import {
	type ExpiryTone,
	keyExpiry,
	LAST_USED_DAYS,
	PRINCIPAL_KIND_LABELS,
} from "@/lib/keyLines";
import { cn } from "@/lib/utils";
import {
	AccountLink,
	BoundPolicyLink,
	UNBOUND,
} from "@/policy-bindings/AccountPolicy";
import { useAccountPolicy } from "@/policy-bindings/useAccountPolicy";
import { OwnerLink } from "@/projects/OwnerLink";
import {
	LineColumns,
	LineRow,
	NumberCell,
	QuietTag,
	SwitchCell,
} from "@/shared/LineGrid";
import { RowMenu } from "@/shared/RowMenu";
import { fmtMoneyCompact } from "@/usage/format";

// The tracks' minimums plus gaps come to 67.5rem, the table's min-w.
const COLS =
	"grid-cols-[minmax(10rem,2fr)_minmax(7rem,1.2fr)_repeat(2,minmax(6rem,1fr))_minmax(4rem,0.6fr)_minmax(4.5rem,0.6fr)_minmax(6rem,0.8fr)_5.5rem_minmax(5.5rem,0.8fr)_3.5rem_2rem]";

/** The table's column labels, on the rows' grid. */
export function KeyColumns() {
	return (
		<LineColumns cols={COLS}>
			<span>Name</span>
			<span>Principal</span>
			<span>Account</span>
			<span>Policy</span>
			<span className="text-right" title="Requests, last 7 days">
				Req 7d
			</span>
			<span className="text-right" title="Spend, last 7 days">
				Spend 7d
			</span>
			<span>Expires</span>
			<span>Passthrough</span>
			<span title={`Latest request in the last ${LAST_USED_DAYS} days`}>
				Last used
			</span>
			<span className="pr-3 text-right">On</span>
			<span />
		</LineColumns>
	);
}

const EXPIRY_TONE: Record<ExpiryTone, string> = {
	never: "text-ink-3",
	expired: "text-destructive",
	soon: "text-warn",
	later: "",
};

/** One API key: who it acts as, where it runs, its traffic and lifetime. */
export function KeyRow({
	line,
	lastUsedLoaded,
	onDelete,
}: {
	line: KeyTableLine;
	/** False until the last-used lookup returns. */
	lastUsedLoaded: boolean;
	onDelete: () => void;
}) {
	const { key: rk, usage, principal } = line;
	const { account, binding, policy } = useAccountPolicy({
		accountId: rk.spec.accountId ?? "",
	});
	const { setEnabled } = useToggleKeyEnabled();
	const enabled = rk.spec.enabled !== false;
	const label = displayLabel(rk.metadata);
	const expiry = keyExpiry(rk.spec.expiresAt, Date.now());

	return (
		<LineRow cols={COLS} dimmed={!enabled}>
			<span className="grid min-w-0">
				<span className="flex h-5 min-w-0 items-center gap-2">
					<Link
						to="/keys/$name"
						params={{ name: rk.metadata.name }}
						className="truncate text-foreground hover:underline"
					>
						{label}
					</Link>
					{rk.spec.revokedAt && (
						<QuietTag
							className="text-destructive"
							title={fmtTs(rk.spec.revokedAt)}
						>
							revoked
						</QuietTag>
					)}
					<span className="shrink-0 empty:hidden">
						<OwnerLink owner={rk.metadata.owner} />
					</span>
					<PlanIssueDot kind="key" id={rk.metadata.id} />
				</span>
				<code className="truncate font-mono text-foot text-ink-3">
					{rk.metadata.name}
				</code>
			</span>
			<span className="grid min-w-0">
				<span className="truncate">{principal}</span>
				<span className="truncate text-foot text-ink-3">
					{PRINCIPAL_KIND_LABELS[rk.spec.principal.kind]}
				</span>
			</span>
			<span className="min-w-0 truncate">
				{account ? <AccountLink account={account} /> : <Dash />}
			</span>
			<span className="flex min-w-0 items-center gap-2">
				{binding ? (
					<>
						<BoundPolicyLink
							binding={binding}
							policy={policy}
							className="truncate hover:underline"
						/>
						{binding.spec.enabled === false && (
							<QuietTag title="The binding is disabled">off</QuietTag>
						)}
					</>
				) : (
					<Dash title={account ? UNBOUND : undefined} />
				)}
			</span>
			<NumberCell value={usage?.requests ? fmtCompact(usage.requests) : null} />
			<NumberCell
				value={usage?.usd != null ? fmtMoneyCompact(usage.usd, "USD") : null}
			/>
			<span
				className={cn("truncate", EXPIRY_TONE[expiry.tone])}
				title={rk.spec.expiresAt ? fmtTs(rk.spec.expiresAt) : undefined}
			>
				{expiry.text}
			</span>
			<span>
				{rk.spec.passthroughAllowed && (
					<Check
						role="img"
						aria-label="Passthrough allowed"
						className="size-3.5 text-ink-2"
					/>
				)}
			</span>
			<LastUsed at={line.lastUsed} loaded={lastUsedLoaded} />
			<SwitchCell
				checked={enabled}
				onChange={(next) => setEnabled(rk, next)}
				label={`${enabled ? "Disable" : "Enable"} ${label}`}
			/>
			<span className="flex justify-end">
				<RowMenu
					actions={[
						{
							label: "Edit",
							render: (
								<Link
									to="/keys/$name/edit"
									params={{ name: rk.metadata.name }}
								/>
							),
						},
						{ label: "Delete", danger: true, onClick: onDelete },
					]}
				/>
			</span>
		</LineRow>
	);
}

/** "3h ago" with the exact time on hover; quiet when the key had no request
 * in the lookback, or while it loads. */
function LastUsed({ at, loaded }: { at?: string; loaded: boolean }) {
	if (!at)
		return (
			<span className="truncate text-ink-3">
				{loaded ? `Not in ${LAST_USED_DAYS} days` : "…"}
			</span>
		);
	return (
		<span className="truncate text-ink-2" title={fmtTs(at)}>
			{fmtAgo(at)}
		</span>
	);
}

function Dash({ title }: { title?: string }) {
	return (
		<span className="text-ink-3" title={title}>
			—
		</span>
	);
}
