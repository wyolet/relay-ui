import {
	Boxes,
	Building2,
	type LucideIcon,
	UserRound,
	Users,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OwnerPick, OwnerPickKind } from "@/lib/ownerPick";
import type { OwnerOption } from "@/lib/ownerScopes";
import { ChoiceCards } from "@/shared/ChoiceCards";

const KIND_CARD: Record<OwnerPickKind, { title: string; icon: LucideIcon }> = {
	personal: { title: "Personal", icon: UserRound },
	team: { title: "Team", icon: Users },
	project: { title: "Project", icon: Boxes },
	organization: { title: "Organization", icon: Building2 },
};

export interface OwnerCardKind<K extends OwnerPickKind> {
	kind: K;
	/** What owning it there means, in the form's terms. */
	description: string;
	/** Why the kind can't be picked; set, its card is disabled. */
	unavailable?: string;
}

function ScopeSelect({
	label,
	placeholder,
	options,
	value,
	onChange,
	error,
}: {
	label: string;
	placeholder: string;
	options: readonly OwnerOption[];
	value: string;
	onChange: (value: string) => void;
	error?: string;
}) {
	return (
		<div>
			<Select
				value={value}
				items={options.map((o) => ({ value: o.value, label: o.label }))}
				onValueChange={(v) => onChange(v ?? "")}
			>
				<SelectTrigger
					className="w-full max-w-md"
					aria-label={label}
					aria-invalid={error ? true : undefined}
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
		</div>
	);
}

/** Who a new row belongs to: one card per owner kind, then the team or project to pick for it. */
export function OwnerCards<K extends OwnerPickKind>({
	kinds,
	pick,
	onPick,
	teamOptions,
	projectOptions,
	teamError,
	projectError,
}: {
	kinds: readonly OwnerCardKind<K>[];
	pick: OwnerPick<K>;
	onPick: (pick: Partial<OwnerPick<K>>) => void;
	teamOptions: readonly OwnerOption[];
	projectOptions: readonly OwnerOption[];
	teamError?: string;
	projectError?: string;
}) {
	return (
		<div className="flex flex-col gap-3">
			<ChoiceCards
				label="Owner"
				options={kinds.map((k) => ({
					value: k.kind,
					title: KIND_CARD[k.kind].title,
					icon: KIND_CARD[k.kind].icon,
					description: k.description,
					...(k.unavailable ? { unavailable: k.unavailable } : {}),
				}))}
				value={pick.ownerKind}
				onChange={(ownerKind) => onPick({ ownerKind })}
			/>
			{pick.ownerKind === "project" && (
				<ScopeSelect
					label="Project"
					placeholder="Pick a project…"
					options={projectOptions}
					value={pick.projectId}
					onChange={(projectId) => onPick({ projectId })}
					error={projectError}
				/>
			)}
			{pick.ownerKind === "team" && (
				<ScopeSelect
					label="Team"
					placeholder="Pick a team…"
					options={teamOptions}
					value={pick.teamId}
					onChange={(teamId) => onPick({ teamId })}
					error={teamError}
				/>
			)}
		</div>
	);
}
