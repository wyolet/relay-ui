import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import type { Host } from "@/api/types/host";
import type { HostKey } from "@/api/types/hostkey";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import type { PolicyHostRequirements as Requirements } from "@/policies/usePolicyHostRequirements";

interface Props {
	requirements: Requirements;
	selectedHostKeyIds: readonly string[];
	onChange: (next: string[]) => void;
}

/**
 * Drives Policy.hostKeyIds from what the catalog ref selection implies:
 * one row per candidate host with an inline key picker, plus a
 * "satisfied / unsatisfied" status dot.
 */
export function PolicyHostRequirements({
	requirements,
	selectedHostKeyIds,
	onChange,
}: Props) {
	const { groups, hosts, unresolvedRefs } = requirements;

	if (groups.length === 0 && unresolvedRefs.length === 0) {
		return (
			<p className="text-[11px] text-muted-foreground">
				Pick models above and Relay will list which hosts need keys here.
			</p>
		);
	}

	const setKeyForHost = (hostId: string, keyId: string | undefined) => {
		const otherKeys = selectedHostKeyIds.filter((id) => {
			const host = hosts.get(hostId);
			if (!host) return true;
			return !host.hostKeys.some((k) => k.metadata.id === id);
		});
		onChange(keyId ? [...otherKeys, keyId] : otherKeys);
	};

	const requiredGroups = groups.filter((g) => g.kind === "required");
	const optionalGroups = groups.filter((g) => g.kind === "optional");

	const requiredHostIds = new Set(
		requiredGroups.flatMap((g) => g.candidateHostIds),
	);

	return (
		<div className="flex flex-col gap-4">
			{requiredHostIds.size > 0 && (
				<HostRows
					title="Required hosts"
					hint="Each of these hosts has at least one selected model. Pick a key for each."
					hostIds={Array.from(requiredHostIds)}
					hosts={hosts}
					onPickKey={setKeyForHost}
				/>
			)}

			{optionalGroups.map((g) => (
				<OptionalRow
					key={g.ref}
					refStr={g.ref}
					candidateHostIds={g.candidateHostIds}
					hosts={hosts}
					onPickKey={setKeyForHost}
				/>
			))}

			{unresolvedRefs.length > 0 && (
				<div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
					<AlertCircle
						className="mt-0.5 h-3.5 w-3.5 text-amber-500 shrink-0"
						aria-hidden
					/>
					<div>
						{unresolvedRefs.length === 1 ? "Ref" : "Refs"}{" "}
						<code className="font-mono text-foreground">
							{unresolvedRefs.join(", ")}
						</code>{" "}
						don't resolve to any current model — no host key needed yet.
					</div>
				</div>
			)}
		</div>
	);
}

interface HostRowsProps {
	title: string;
	hint: string;
	hostIds: string[];
	hosts: Requirements["hosts"];
	onPickKey: (hostId: string, keyId: string | undefined) => void;
}

function HostRows({ title, hint, hostIds, hosts, onPickKey }: HostRowsProps) {
	return (
		<div>
			<div className="mb-1.5">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</div>
				<div className="text-[11px] text-muted-foreground">{hint}</div>
			</div>
			<div className="divide-y divide-border rounded-md border border-border">
				{hostIds.map((id) => {
					const req = hosts.get(id);
					if (!req) return null;
					return (
						<HostRow
							key={id}
							hostId={id}
							hostKeys={req.hostKeys}
							host={req.host}
							selectedKeyId={req.selectedKeyId}
							onPickKey={onPickKey}
						/>
					);
				})}
			</div>
		</div>
	);
}

interface HostRowProps {
	hostId: string;
	host: Host;
	hostKeys: HostKey[];
	selectedKeyId: string | undefined;
	onPickKey: (hostId: string, keyId: string | undefined) => void;
}

function HostRow({
	hostId,
	host,
	hostKeys,
	selectedKeyId,
	onPickKey,
}: HostRowProps) {
	const satisfied = selectedKeyId !== undefined;
	const hasAnyKey = hostKeys.length > 0;

	return (
		<div className="flex items-center gap-3 px-3 py-2">
			<HostLogo host={host} size={20} />
			<div className="flex-1 min-w-0">
				<div className="text-sm text-foreground truncate">
					{displayLabel(host.metadata)}
				</div>
				<div className="text-[11px] text-muted-foreground truncate">
					{hostKeys.length} key{hostKeys.length === 1 ? "" : "s"} defined
				</div>
			</div>

			<div className="w-64 shrink-0">
				{hasAnyKey ? (
					<Select
						value={selectedKeyId ?? ""}
						items={hostKeys.map((k) => ({
							value: k.metadata.id ?? "",
							label: displayLabel(k.metadata),
						}))}
						onValueChange={(v) =>
							onPickKey(hostId, v == null || v === "" ? undefined : v)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select a key…" />
						</SelectTrigger>
						<SelectContent>
							{hostKeys.map((k) => (
								<SelectItem key={k.metadata.id} value={k.metadata.id ?? ""}>
									{displayLabel(k.metadata)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				) : (
					<div className="text-[11px] text-amber-600 dark:text-amber-400">
						No keys for this host — create one first.
					</div>
				)}
			</div>

			<div className="w-5 shrink-0 flex justify-end" aria-hidden>
				{satisfied ? (
					<CheckCircle2 className="h-4 w-4 text-emerald-500" />
				) : (
					<Circle className="h-4 w-4 text-muted-foreground" />
				)}
			</div>
		</div>
	);
}

interface OptionalRowProps {
	refStr: string;
	candidateHostIds: string[];
	hosts: Requirements["hosts"];
	onPickKey: (hostId: string, keyId: string | undefined) => void;
}

function OptionalRow({
	refStr,
	candidateHostIds,
	hosts,
	onPickKey,
}: OptionalRowProps) {
	const satisfied = candidateHostIds.some(
		(id) => hosts.get(id)?.selectedKeyId !== undefined,
	);
	return (
		<div className="rounded-md border border-border">
			<div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
				<div className="text-[11px] text-muted-foreground">
					<code className="font-mono text-foreground">{refStr}</code> — pick a
					key from any one of these hosts:
				</div>
				{satisfied ? (
					<CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
				) : (
					<Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
				)}
			</div>
			<div className="divide-y divide-border">
				{candidateHostIds.map((id) => {
					const req = hosts.get(id);
					if (!req) return null;
					return (
						<HostRow
							key={id}
							hostId={id}
							host={req.host}
							hostKeys={req.hostKeys}
							selectedKeyId={req.selectedKeyId}
							onPickKey={onPickKey}
						/>
					);
				})}
			</div>
		</div>
	);
}
