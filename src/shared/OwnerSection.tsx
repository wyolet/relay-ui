import {
	Boxes,
	CircleDot,
	type LucideIcon,
	UserRound,
	Users,
} from "lucide-react";
import { useId } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type OwnerOption, PERSONAL_OWNER } from "@/lib/ownerScopes";
import { FormSection } from "@/shared/FormSection";

const KIND_ICON: Record<string, LucideIcon> = {
	user: UserRound,
	team: Users,
	project: Boxes,
};

const KIND_LABEL: Record<string, string> = {
	user: "User",
	team: "Team",
	project: "Project",
	system: "System",
	host: "Host",
	provider: "Provider",
};

interface OwnerSectionProps {
	options: readonly OwnerOption[];
	value: string;
	onChange: (value: string) => void;
	description?: string;
	title?: string;
	icon?: LucideIcon;
	placeholder?: string;
	error?: string;
}

function OwnerLabel({ option }: { option: OwnerOption }) {
	const Icon = KIND_ICON[option.kind] ?? CircleDot;
	return (
		<>
			<Icon className="text-muted-foreground" aria-hidden="true" />
			<span className="truncate">{option.label}</span>
		</>
	);
}

export function OwnerSection({
	options,
	value,
	onChange,
	description = "Personal, or a team or project you can create in. Picking another scope on edit moves the row there.",
	title = "Owner",
	icon = UserRound,
	placeholder = "Pick an owner…",
	error,
}: OwnerSectionProps) {
	const errorId = useId();
	const selected = options.find((o) => o.value === value);
	const mixedKinds = new Set(options.map((o) => o.kind)).size > 1;

	return (
		<FormSection icon={icon} title={title} description={description}>
			<div>
				<Select
					value={value}
					items={options.map((o) => ({ value: o.value, label: o.label }))}
					onValueChange={(v) => onChange(v ?? "")}
				>
					<SelectTrigger
						className="w-full max-w-md"
						aria-label={title}
						aria-invalid={error ? true : undefined}
						aria-describedby={error ? errorId : undefined}
					>
						<SelectValue placeholder={placeholder}>
							{selected ? <OwnerLabel option={selected} /> : undefined}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{options.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								<span className="flex w-full items-center gap-2">
									<OwnerLabel option={o} />
									{mixedKinds && o.value !== PERSONAL_OWNER && (
										<span className="ml-auto pr-5 pl-3 text-[11px] text-muted-foreground">
											{KIND_LABEL[o.kind] ?? o.kind}
										</span>
									)}
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{error && (
					<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
						{error}
					</p>
				)}
			</div>
		</FormSection>
	);
}
