import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	Circle,
	Plus,
	X,
} from "lucide-react";
import type { HostKey } from "@/api/types/hostkey";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { HostLogo } from "@/hosts/HostLogo";
import { displayLabel } from "@/lib/displayLabel";
import type {
	HostRequirement,
	PolicyHostRequirements as Requirements,
} from "@/policies/usePolicyHostRequirements";
import { AlertBanner } from "@/shared/AlertBanner";
import { OptionRow } from "@/shared/OptionRow";

interface Props {
	requirements: Requirements;
	selectedHostKeyIds: readonly string[];
	onChange: (next: string[]) => void;
}

/**
 * Drives Policy.hostKeyIds from what the catalog ref selection implies:
 * one card per candidate host with a multi-select key list, plus a
 * "satisfied / needs key" status.
 */
export function PolicyHostRequirements({
	requirements,
	selectedHostKeyIds,
	onChange,
}: Props) {
	const { groups, hosts, unresolvedRefs, danglingHosts } = requirements;

	if (
		groups.length === 0 &&
		unresolvedRefs.length === 0 &&
		danglingHosts.size === 0
	) {
		return (
			<p className="text-[11px] text-muted-foreground">
				Pick models above and Relay will list which hosts need keys here.
			</p>
		);
	}

	const toggleKey = (keyId: string, on: boolean) => {
		const set = new Set(selectedHostKeyIds);
		if (on) set.add(keyId);
		else set.delete(keyId);
		onChange(Array.from(set));
	};

	const requiredGroups = groups.filter((g) => g.kind === "required");
	const optionalGroups = groups.filter((g) => g.kind === "optional");

	const requiredHostIds = Array.from(
		new Set(requiredGroups.flatMap((g) => g.candidateHostIds)),
	);

	const missingRequired = requiredHostIds.filter((id) => {
		const req = hosts.get(id);
		// noAuth hosts route with no credential — never "missing".
		if (!req || req.noAuth) return false;
		return req.selectedKeyIds.length === 0;
	});

	return (
		<div className="flex flex-col gap-4">
			{missingRequired.length > 0 && (
				<AlertBanner
					severity="warn"
					title={
						missingRequired.length === 1
							? "1 host needs a key"
							: `${missingRequired.length} hosts need keys`
					}
				>
					Your catalog selection requires keys for{" "}
					{missingRequired
						.map((id) => {
							const h = hosts.get(id)?.host;
							return h ? displayLabel(h.metadata) : id;
						})
						.join(", ")}
					. Calls to those hosts will fail until a key is attached.
				</AlertBanner>
			)}

			{requiredHostIds.length > 0 && (
				<HostGroup title="Required hosts">
					{requiredHostIds.map((id) => {
						const req = hosts.get(id);
						if (!req) return null;
						return (
							<HostCard key={id} req={req} onToggle={toggleKey} required />
						);
					})}
				</HostGroup>
			)}

			{(() => {
				const seen = new Set(requiredHostIds);
				return optionalGroups.flatMap((g) => {
					const remaining = g.candidateHostIds.filter((id) => !seen.has(id));
					if (remaining.length === 0) return [];
					for (const id of remaining) seen.add(id);
					return [
						<HostGroup
							key={g.ref}
							title="One of these hosts"
							hint={
								<>
									<code className="font-mono text-foreground">{g.ref}</code>{" "}
									resolves to multiple hosts — a key from any one is enough.
								</>
							}
						>
							{remaining.map((id) => {
								const req = hosts.get(id);
								if (!req) return null;
								return <HostCard key={id} req={req} onToggle={toggleKey} />;
							})}
						</HostGroup>,
					];
				});
			})()}

			{danglingHosts.size > 0 && (
				<HostGroup
					title="Keys outside catalog"
					hint="These keys are attached but their host isn't in your catalog selection. They'll never be used here."
				>
					{Array.from(danglingHosts.values()).map((req) => (
						<HostCard
							key={req.host.metadata.id ?? req.host.metadata.name}
							req={req}
							onToggle={toggleKey}
							dangling
						/>
					))}
				</HostGroup>
			)}

			{unresolvedRefs.length > 0 && (
				<AlertBanner severity="info" title="Unresolved catalog refs">
					{unresolvedRefs.length === 1 ? "Ref" : "Refs"}{" "}
					<code className="font-mono text-foreground">
						{unresolvedRefs.join(", ")}
					</code>{" "}
					don't resolve to any current model — no credential needed yet.
				</AlertBanner>
			)}
		</div>
	);
}

interface HostGroupProps {
	title: string;
	hint?: React.ReactNode;
	children: React.ReactNode;
}

function HostGroup({ title, hint, children }: HostGroupProps) {
	return (
		<div>
			<div className="mb-1.5">
				<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
					{title}
				</div>
				{hint && (
					<div className="text-[11px] text-muted-foreground">{hint}</div>
				)}
			</div>
			<div className="flex flex-col gap-2">{children}</div>
		</div>
	);
}

interface HostCardProps {
	req: HostRequirement;
	onToggle: (keyId: string, on: boolean) => void;
	required?: boolean;
	dangling?: boolean;
}

function HostCard({ req, onToggle, required, dangling }: HostCardProps) {
	const { host, hostKeys, selectedKeyIds, noAuth } = req;
	const satisfied = selectedKeyIds.length > 0;
	const hasAnyKey = hostKeys.length > 0;
	const selectedSet = new Set(selectedKeyIds);
	const available = hostKeys.filter(
		(k) => k.metadata.id && !selectedSet.has(k.metadata.id),
	);

	return (
		<div className="rounded-md border border-border bg-card">
			<div className="flex items-center gap-3 px-3 py-2">
				<HostLogo host={host} size={20} />
				<div className="flex-1 min-w-0">
					<div className="text-sm text-foreground truncate">
						{displayLabel(host.metadata)}
					</div>
					<div className="text-[11px] text-muted-foreground truncate">
						{noAuth ? (
							"Routes without a credential"
						) : (
							<>
								{hostKeys.length} key{hostKeys.length === 1 ? "" : "s"}{" "}
								available
								{selectedKeyIds.length > 0
									? ` · ${selectedKeyIds.length} attached`
									: ""}
							</>
						)}
					</div>
				</div>
				<StatusBadge
					satisfied={satisfied}
					required={required}
					dangling={dangling}
					noAuth={noAuth}
				/>
			</div>

			{selectedKeyIds.length > 0 && (
				<ul className="border-t border-border divide-y divide-border">
					{selectedKeyIds.map((id) => {
						const key = hostKeys.find((k) => k.metadata.id === id);
						if (!key) return null;
						return (
							<li
								key={id}
								className="flex items-center justify-between px-3 py-1.5 text-xs"
							>
								<span className="truncate text-foreground">
									{displayLabel(key.metadata)}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => onToggle(id, false)}
									className="text-muted-foreground"
									aria-label={`Detach ${displayLabel(key.metadata)}`}
								>
									<X className="size-3.5" />
								</Button>
							</li>
						);
					})}
				</ul>
			)}

			{/* noAuth hosts need no credential — the key-picker bar is irrelevant. */}
			{!noAuth && (
				<div className="border-t border-border px-3 py-1.5 flex items-center justify-between">
					{hasAnyKey ? (
						<AddKeyPopover
							available={available}
							onPick={(id) => onToggle(id, true)}
							disabled={available.length === 0}
						/>
					) : (
						<div className="flex items-center gap-1.5 text-[11px] text-warning">
							<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
							No keys exist for this host.
						</div>
					)}
					<Link
						to="/host-keys/new"
						className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
					>
						<Plus className="h-3 w-3" aria-hidden />
						Create new key
					</Link>
				</div>
			)}
		</div>
	);
}

interface StatusBadgeProps {
	satisfied: boolean;
	required?: boolean;
	dangling?: boolean;
	noAuth?: boolean;
}

function StatusBadge({
	satisfied,
	required,
	dangling,
	noAuth,
}: StatusBadgeProps) {
	if (dangling) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] text-warning">
				<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
				outside catalog
			</span>
		);
	}
	if (satisfied) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] text-success">
				<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
				attached
			</span>
		);
	}
	if (noAuth) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] text-success">
				<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
				no key needed
			</span>
		);
	}
	if (required) {
		return (
			<span className="inline-flex items-center gap-1 text-[11px] text-warning">
				<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
				needs key
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
			<Circle className="h-3.5 w-3.5" aria-hidden />
			none attached
		</span>
	);
}

interface AddKeyPopoverProps {
	available: HostKey[];
	onPick: (keyId: string) => void;
	disabled: boolean;
}

function AddKeyPopover({ available, onPick, disabled }: AddKeyPopoverProps) {
	if (disabled) {
		return (
			<span className="text-[11px] text-muted-foreground">
				All keys attached
			</span>
		);
	}
	return (
		<Popover>
			<PopoverTrigger className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium text-foreground border border-border hover:bg-muted">
				<Plus className="h-3 w-3" aria-hidden />
				Add key
				<ChevronDown className="h-3 w-3" aria-hidden />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-1">
				<ul className="flex flex-col">
					{available.map((k) => (
						<li key={k.metadata.id}>
							<OptionRow
								onClick={() => k.metadata.id && onPick(k.metadata.id)}
								className="rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted"
							>
								{displayLabel(k.metadata)}
							</OptionRow>
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
