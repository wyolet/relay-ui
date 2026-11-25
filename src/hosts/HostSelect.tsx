import { Server } from "lucide-react";
import { type ReactNode, useId } from "react";
import type { Host } from "@/api/types/host";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { HostLogo, type HostLogoLike } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";

/** One host in the picker: its id, label and logo. */
export interface HostOption {
	value: string;
	label: string;
	host: HostLogoLike;
}

/** The picker's options for a host list. */
export function toHostOptions(hosts: readonly Host[]): HostOption[] {
	return hosts.map((h) => ({
		value: h.metadata.id ?? "",
		label: displayLabel(h.metadata),
		host: h,
	}));
}

interface HostSelectProps {
	value: string;
	options: readonly HostOption[];
	onChange: (hostId: string) => void;
	error?: string;
	disabled?: boolean;
	/** Muted note under the select, e.g. why the host is fixed. */
	hint?: ReactNode;
}

/** Labeled host picker for resource forms; the value is the host id. */
export function HostSelect({
	value,
	options,
	onChange,
	error,
	disabled,
	hint,
}: HostSelectProps) {
	const errorId = useId();
	const picked = options.find((o) => o.value === value);
	return (
		<div>
			<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1 inline-flex items-center gap-1">
				<Server className="w-3 h-3" />
				Host
			</div>
			<Select
				value={value}
				items={options}
				onValueChange={(v) => onChange(v ?? "")}
				disabled={disabled}
			>
				<SelectTrigger
					className="w-full max-w-md"
					aria-label="Host"
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
				>
					<SelectValue placeholder="Pick a host…">
						{picked ? <HostOptionLabel option={picked} /> : undefined}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{options.map((h) => (
						<SelectItem key={h.value} value={h.value}>
							<HostOptionLabel option={h} />
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{error && (
				<p id={errorId} className="mt-1.5 text-[11px] text-destructive">
					{error}
				</p>
			)}
			{hint && (
				<p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
			)}
		</div>
	);
}

function HostOptionLabel({ option }: { option: HostOption }) {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<HostLogo host={option.host} size={16} />
			<span className="truncate">{option.label}</span>
		</span>
	);
}
