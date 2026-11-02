import { Boxes, Building2, Search, TextCursorInput } from "lucide-react";
import { useState } from "react";
import {
	fieldFocusClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PickerModelList } from "@/models/PickerModelList";
import { PickerProviderList } from "@/models/PickerProviderList";
import { PickerRawEditor } from "@/models/PickerRawEditor";
import { PickerSelectionFooter } from "@/models/PickerSelectionFooter";
import { PickerSelectionSummary } from "@/models/PickerSelectionSummary";
import { usePickerCatalog } from "@/models/usePickerCatalog";
import { usePickerSearch } from "@/models/usePickerSearch";
import { usePickerSelection } from "@/models/usePickerSelection";

type Tab = "providers" | "models" | "raw";

interface ModelPickerProps {
	value: string[];
	onChange: (next: string[]) => void;
	/** What an empty selection means to the caller. */
	emptyText: string;
	/** Catalog refs (a parent policy's models) the rows are trimmed to. */
	restrictTo?: readonly string[];
}

/**
 * Picker that emits `provider` and `provider/model` refs; an empty value is a
 * valid choice the caller names in `emptyText`. A row is *covered* when a
 * provider ref already includes it: covered rows are read-only until the
 * provider ref is removed.
 */
export function ModelPicker({
	value,
	onChange,
	emptyText,
	restrictTo,
}: ModelPickerProps) {
	const [tab, setTab] = useState<Tab>("providers");
	const selection = usePickerSelection({ value, onChange });
	const index = usePickerCatalog(restrictTo);
	const search = usePickerSearch(index);
	const { refs } = selection;

	return (
		<div className="flex flex-col rounded-md border border-border bg-card overflow-hidden">
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
				{tab === "raw" && (
					<PickerRawEditor value={value} onChange={onChange} index={index} />
				)}
			</div>

			{tab !== "raw" && (
				<>
					<PickerSelectionFooter
						refs={value}
						onRemove={selection.removeRaw}
						emptyText={emptyText}
					/>
					{refs.length > 0 && (
						<PickerSelectionSummary refs={refs} index={index} />
					)}
				</>
			)}
		</div>
	);
}
