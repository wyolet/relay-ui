import {
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
} from "@/components/ui/select";
import type { PolicyOption } from "@/policy-bindings/accountLookup";

/** A binding's policy choices: the operator's policies, then host tier presets under their own heading. */
export function PolicySelectItems({
	options,
}: {
	options: readonly PolicyOption[];
}) {
	const own = options.filter((o) => !o.tierPreset);
	const presets = options.filter((o) => o.tierPreset);
	return (
		<>
			{own.map((o) => (
				<SelectItem key={o.value} value={o.value}>
					{o.label}
				</SelectItem>
			))}
			{presets.length > 0 && (
				<SelectGroup>
					{own.length > 0 && <SelectSeparator />}
					<SelectLabel>Provider tier presets</SelectLabel>
					{presets.map((o) => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectGroup>
			)}
		</>
	);
}
