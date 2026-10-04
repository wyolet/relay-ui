import { Wallet } from "lucide-react";
import { DetailCard, DetailEmpty } from "@/shared/DetailCard";

/**
 * Budget consumption tiles for the home page. NOT MOUNTED: the relay has no
 * budgets endpoint yet (nothing under `/api/budgets` in types.gen.ts), so
 * there is no honest number to show. When the endpoint lands, read it here
 * and mount this beside TenancyOverview — do not derive a budget from spend.
 */
export function BudgetTiles() {
	return (
		<DetailCard title="Budgets" icon={Wallet}>
			<DetailEmpty>Budget reporting is not available yet.</DetailEmpty>
		</DetailCard>
	);
}
