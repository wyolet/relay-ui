import { ListChecks, Share2 } from "lucide-react";
import { receiverKey } from "@/byok/byokChoices";
import type { useByokForm } from "@/byok/useByokForm";
import { FormSection } from "@/shared/FormSection";
import { BoxedCheckList } from "@/shared/MultiSelect";
import { WriteList } from "@/shared/WriteList";

type ByokForm = ReturnType<typeof useByokForm>;

const KIND_LABEL = { team: "Team", project: "Project" } as const;

export function SharingStep({ byok }: { byok: ByokForm }) {
	return (
		<div className="divide-y divide-border">
			<FormSection
				icon={Share2}
				title="Share with"
				description="Teams and projects that may use the account besides its owner. A share is used once an agent or a policy there picks the account; leave it empty to keep the account to its owner."
			>
				<BoxedCheckList
					options={byok.receivers.map((r) => ({
						value: receiverKey(r),
						label: r.label,
						hint: KIND_LABEL[r.kind],
					}))}
					selected={byok.values.receiverKeys}
					onToggle={byok.toggleReceiver}
					emptyLabel="teams or projects"
				/>
			</FormSection>

			<FormSection
				icon={ListChecks}
				title="On create"
				description="What Store key does, in this order."
			>
				<WriteList
					items={byok.planned.map((w) => ({
						id: w.id,
						label: w.label,
						status: "waiting",
					}))}
				/>
			</FormSection>
		</div>
	);
}
