import { Link, useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { MODE_LABELS, PERIOD_LABELS } from "@/budgets/budgetFormat";
import { useBudgetDetail } from "@/budgets/useBudgetDetail";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { fmtUsd } from "@/lib/limitsFormat";
import { BackLink } from "@/shared/BackLink";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";

/** `children` renders below the cap: sections owned by the domains that
 * link a budget. */
export function BudgetDetailView({
	name,
	children,
}: {
	name: string;
	children?: ReactNode;
}) {
	const navigate = useNavigate();
	const { budget, period, mode, del, requestDelete } = useBudgetDetail({
		name,
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "budgets" } }),
	});

	return (
		<div>
			<DetailPageHeader
				back={
					<BackLink to="/policies" search={{ tab: "budgets" }}>
						Budgets
					</BackLink>
				}
				icon={Wallet}
				metadata={budget.metadata}
			>
				<DetailHeaderActions
					enabled
					onToggle={() => undefined}
					showToggle={false}
					onDelete={requestDelete}
					deleting={del.isPending}
					editLink={({ className, content }) => (
						<Link
							to="/policies/budgets/$name/edit"
							params={{ name }}
							className={className}
						>
							{content}
						</Link>
					)}
				/>
			</DetailPageHeader>

			<div className="flex flex-col gap-5">
				<PlanIssuesPanel kind="budget" id={budget.metadata.id} />

				<DetailCard title="Cap" icon={Wallet}>
					<dl className="divide-y divide-border">
						<DetailRow label="Amount">
							<span className="text-sm tabular-nums">
								{fmtUsd(budget.spec.amountUsd)}
							</span>
						</DetailRow>
						<DetailRow label="Period">
							{PERIOD_LABELS[period]}
							<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
								Calendar {PERIOD_LABELS[period].toLowerCase()}, in UTC.
							</p>
						</DetailRow>
						<DetailRow label="Mode">
							{MODE_LABELS[mode].label}
							<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
								{MODE_LABELS[mode].hint}
							</p>
						</DetailRow>
					</dl>
				</DetailCard>

				{children}

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
		</div>
	);
}
