import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Wallet } from "lucide-react";
import {
	fmtBudgetAmount,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { useBudgetDetail } from "@/budgets/useBudgetDetail";
import { PlanIssuesPanel } from "@/diagnostics/IssuesPanel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";
import { DetailPageHeader } from "@/shared/DetailPageHeader";

export function BudgetDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const { budget, period, mode, del, requestDelete } = useBudgetDetail({
		name,
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "budgets" } }),
	});

	return (
		<div className="flex flex-col gap-5">
			<Link
				to="/policies"
				search={{ tab: "budgets" }}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Budgets
			</Link>

			<DetailPageHeader icon={Wallet} metadata={budget.metadata}>
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

			<PlanIssuesPanel kind="budget" id={budget.metadata.id} />

			<DetailCard title="Cap" icon={Wallet}>
				<dl className="divide-y divide-border">
					<DetailRow label="Amount">
						<span className="text-sm tabular-nums">
							{fmtBudgetAmount(budget.spec.amountUsd)}
						</span>
					</DetailRow>
					<DetailRow label="Period">
						{PERIOD_LABELS[period]}
						<span className="text-muted-foreground"> · calendar, UTC</span>
					</DetailRow>
					<DetailRow label="Mode">
						{MODE_LABELS[mode].label}
						<p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
							{MODE_LABELS[mode].hint}
						</p>
					</DetailRow>
				</dl>
			</DetailCard>

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
