import { Server, Users } from "lucide-react";
import { useId, useState } from "react";
import type { useByokForm } from "@/byok/useByokForm";
import { HostLogo } from "@/hosts/HostLogo";
import type { OwnerPickKind } from "@/lib/ownerPick";
import { FieldError } from "@/shared/FieldError";
import { FormSection } from "@/shared/FormSection";
import { OptionRow } from "@/shared/OptionRow";
import { OwnerCards } from "@/shared/OwnerCards";
import { SearchBox } from "@/shared/SearchBox";

type ByokForm = ReturnType<typeof useByokForm>;

const OWNER_DESCRIPTIONS: Record<OwnerPickKind, string> = {
	personal: "Yours. Only your own keys and agents use it unless you share it.",
	team: "The team's. Its projects reach it without a share.",
	project: "One project's. Only that project reaches it.",
	organization: "The organization's, managed by its admins.",
};

const SEARCH_FROM = 9;

export function ProviderStep({ byok }: { byok: ByokForm }) {
	const { values, errors } = byok;
	const [needle, setNeedle] = useState("");
	const hostErrorId = useId();
	const shown = needle
		? byok.hosts.filter((h) =>
				h.label.toLowerCase().includes(needle.toLowerCase()),
			)
		: byok.hosts;
	return (
		<div className="divide-y divide-border">
			<FormSection
				icon={Server}
				title="Provider"
				description="Where the key is from. Relay sends requests there with it."
			>
				<div className="flex flex-col gap-3">
					{byok.hosts.length >= SEARCH_FROM && (
						<SearchBox
							value={needle}
							onChange={setNeedle}
							debounceMs={0}
							hotkey={false}
							placeholder="Search providers"
							aria-label="Search providers"
							className="max-w-md"
						/>
					)}
					<fieldset
						aria-label="Provider"
						aria-describedby={errors.hostId ? hostErrorId : undefined}
						className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
					>
						{shown.map((h) => {
							const selected = h.id === values.hostId;
							return (
								<OptionRow
									key={h.id}
									aria-pressed={selected}
									selected={selected}
									onClick={() => byok.chooseHost(h.id)}
									className="rounded-lg border border-border bg-card px-3 py-2.5 data-[selected]:border-primary"
								>
									<HostLogo host={h.host} size={22} />
									<span className="truncate text-sm font-medium text-foreground">
										{h.label}
									</span>
								</OptionRow>
							);
						})}
					</fieldset>
					{shown.length === 0 && (
						<p className="text-xs text-muted-foreground">
							No provider matches.
						</p>
					)}
					<FieldError id={hostErrorId} message={errors.hostId} />
				</div>
			</FormSection>

			<FormSection
				icon={Users}
				title="Owner"
				description="Who the key and its account belong to. The owner decides who else may use it."
			>
				<OwnerCards
					kinds={byok.ownerKinds.map((kind) => ({
						kind,
						description: OWNER_DESCRIPTIONS[kind],
					}))}
					pick={values}
					onPick={byok.chooseOwner}
					teamOptions={byok.teamOptions}
					projectOptions={byok.projectOptions}
					teamError={errors.teamId}
					projectError={errors.projectId}
				/>
			</FormSection>
		</div>
	);
}
