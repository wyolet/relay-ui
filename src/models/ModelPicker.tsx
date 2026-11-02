import { Boxes, Building2, Globe, Search, TextCursorInput } from "lucide-react";
import { useState } from "react";
import {
	fieldFocusClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PickerHostList } from "@/models/PickerHostList";
import { PickerModelList } from "@/models/PickerModelList";
import { PickerProviderList } from "@/models/PickerProviderList";
import { PickerRawEditor } from "@/models/PickerRawEditor";
import { PickerSelectionFooter } from "@/models/PickerSelectionFooter";
import { PickerSelectionSummary } from "@/models/PickerSelectionSummary";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { usePickerSearch } from "@/models/usePickerSearch";
import { usePickerSelection } from "@/models/usePickerSelection";

type Tab = "summary" | "providers" | "models" | "hosts" | "raw";

interface ModelPickerProps {
	value: string[];
	onChange: (next: string[]) => void;
	includeDeprecated: boolean;
	/**
	 * Optional list of catalog-ref strings (a parent policy's allowed catalog)
	 * to restrict the providers / models / hosts shown to only those covered
	 * by at least one of these refs. When provided, the "Restrict access"
	 * toggle is hidden and the picker is always in restricted mode.
	 */
	restrictTo?: readonly string[];
}

/**
 * Picker that emits catalog-ref strings. Three tabs (Providers / Models /
 * Hosts) all back the same underlying selection — toggling something in any
 * tab adds or removes the corresponding ref(s).
 *
 * "Selected" vs "covered": a row is *covered* when a coarser ref already
 * grants it (e.g. provider ref covers all of its models). Covered rows render
 * as grey-checked and are read-only — to deselect, the operator removes the
 * coarser ref.
 */
export function ModelPicker({
	value,
	onChange,
	includeDeprecated,
	restrictTo,
}: ModelPickerProps) {
	const [tab, setTab] = useState<Tab>("providers");
	const selection = usePickerSelection({ value, onChange, restrictTo });
	const index = usePickerCatalog(restrictTo);
	const search = usePickerSearch(index, includeDeprecated);
	const { refs, restricted } = selection;

	return (
		<div className="flex flex-col rounded-md border border-border bg-card overflow-hidden">
			{!selection.hasParentRestriction && (
				<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
					<div className="flex items-center gap-2.5">
						<Switch
							checked={restricted}
							onCheckedChange={selection.setRestricted}
							aria-label="Restrict catalog access"
						/>
						<div className="leading-tight">
							<div className="text-[12px] font-medium text-foreground">
								{restricted ? "Restricted" : "All catalog allowed"}
							</div>
							<div className="text-[10px] text-muted-foreground">
								{restricted
									? "Pick what keys may call."
									: "Every provider, model, and host."}
							</div>
						</div>
					</div>
				</div>
			)}

			{!restricted ? null : (
				<>
					<div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
						<Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
							<TabsList>
								<TabsTrigger value="providers">
									<Building2 className="w-3 h-3" />
									Providers
								</TabsTrigger>
								<TabsTrigger value="models">
									<Boxes className="w-3 h-3" />
									Models
								</TabsTrigger>
								<TabsTrigger value="hosts">
									<Globe className="w-3 h-3" />
									Hosts
								</TabsTrigger>
								<TabsTrigger value="raw">
									<TextCursorInput className="w-3 h-3" />
									Raw
								</TabsTrigger>
							</TabsList>
						</Tabs>
						{tab !== "raw" && (
							<div className="relative flex-1 max-w-xs">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
								<input
									type="text"
									value={search.q}
									onChange={(e) => search.setQ(e.currentTarget.value)}
									placeholder={`Search ${tab}…`}
									className={cn(
										"w-full h-7 pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground transition-[color,box-shadow,background-color]",
										fieldFrameClassName,
										fieldFocusClassName,
									)}
								/>
							</div>
						)}
					</div>

					<div className="max-h-72 overflow-y-auto">
						{tab === "providers" && (
							<PickerProviderList
								providers={search.providers}
								index={index}
								refs={refs}
								onToggle={selection.toggleProvider}
							/>
						)}
						{tab === "models" && (
							<PickerModelList
								models={search.models}
								index={index}
								refs={refs}
								onToggleModel={selection.toggleModel}
							/>
						)}
						{tab === "hosts" && (
							<PickerHostList
								hosts={search.hosts}
								index={index}
								refs={refs}
								onToggle={selection.toggleHost}
							/>
						)}
						{tab === "raw" && (
							<PickerRawEditor
								value={value}
								onChange={onChange}
								index={index}
							/>
						)}
					</div>

					{tab !== "raw" && (
						<>
							<PickerSelectionFooter
								refs={value}
								onRemove={selection.removeRaw}
							/>
							{refs.length > 0 && (
								<PickerSelectionSummary
									refs={refs}
									index={index}
									includeDeprecated={includeDeprecated}
								/>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
}
