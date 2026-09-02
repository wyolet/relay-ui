import { Wallet } from "lucide-react";
import type { TeamBudget } from "@/api/types/team";
import { DetailCard, DetailRow } from "@/shared/DetailCard";

/** Read-only budget block. Renders nothing when the scope has no budget —
 * the fields are not editable from the UI yet. */
export function BudgetCard({ budget }: { budget: TeamBudget | undefined }) {
	if (!budget?.amount) return null;
	return (
		<DetailCard title="Budget" icon={Wallet}>
			<dl className="divide-y divide-border">
				<DetailRow label="Amount">
					<span className="font-mono">${budget.amount}</span>
				</DetailRow>
				<DetailRow label="Period">{budget.period ?? "month"}</DetailRow>
				<DetailRow label="On exceed">{budget.onExceed ?? "block"}</DetailRow>
			</dl>
		</DetailCard>
	);
}
