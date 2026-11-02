import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Wallet } from "lucide-react";
import {
	fmtBudgetAmount,
	MODE_LABELS,
	PERIOD_LABELS,
} from "@/budgets/budgetFormat";
import { useBudgetDetail } from "@/budgets/useBudgetDetail";
import { displayLabel, hasDisplayName } from "@/lib/displayLabel";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard, DetailRow } from "@/shared/DetailCard";
import { DetailHeaderActions } from "@/shared/DetailHeaderActions";

export function BudgetDetailView({ name }: { name: string }) {
	const navigate = useNavigate();
	const { budget, period, mode, del, requestDelete } = useBudgetDetail({
		name,
		onDeleted: () =>
			void navigate({ to: "/policies", search: { tab: "budgets" } }),
	});
	const description = budget.metadata.description?.trim();

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

			<header className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex items-start gap-3">
					<div className="mt-0.5 w-9 h-9 rounded-md bg-muted border border-border shrink-0 flex items-center justify-center">
						<Wallet className="w-4 h-4 text-muted-foreground" aria-hidden />
					</div>
					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-foreground truncate flex items-center gap-2">
							{displayLabel(budget.metadata)}
							{!hasDisplayName(budget.metadata) && (
								<span className="text-[11px] text-muted-foreground font-normal">
									(no display name)
								</span>
							)}
						</h1>
						<p className="mt-1 text-xs text-muted-foreground font-mono truncate">
							{budget.metadata.name}
						</p>
						{description && (
							<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
								{description}
							</p>
						)}
					</div>
				</div>
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
			</header>

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
