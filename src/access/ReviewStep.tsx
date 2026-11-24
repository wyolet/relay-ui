import { ListChecks } from "lucide-react";
import type { useSetAccessForm } from "@/access/useSetAccessForm";
import { FormSection } from "@/shared/FormSection";
import { WriteList } from "@/shared/WriteList";

type SetAccessForm = ReturnType<typeof useSetAccessForm>;

export function ReviewStep({ access }: { access: SetAccessForm }) {
	const { planned } = access;
	return (
		<FormSection
			icon={ListChecks}
			title="On save"
			description="What Save access does, in this order."
		>
			{planned.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					This is what {access.target.label} reaches already.
				</p>
			) : (
				<div className="flex flex-col gap-3">
					<WriteList
						items={planned.map((w) => ({
							id: w.id,
							label: w.label,
							status: "waiting",
						}))}
					/>
					{access.unlinksPools && (
						<p className="text-xs text-muted-foreground">
							Pools no longer linked are kept; delete them from Pools if unused.
						</p>
					)}
				</div>
			)}
		</FormSection>
	);
}
