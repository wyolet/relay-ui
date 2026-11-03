import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { SharedByBadge } from "@/accounts/SharedByBadge";
import { IconButton } from "@/components/ui/icon-button";
import type { UnavailablePicks } from "@/lib/workContext";
import type { PoolMemberOption } from "@/pools/poolMembers";
import { OptionRow } from "@/shared/OptionRow";
import { NotAvailableTag } from "@/shared/ScopeNotes";
import { StatusInline } from "@/shared/StatusBadge";

const headingClass =
	"text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1";

/** An ordered list of a pool's accounts or keys, with the ones that may still join below it. */
export function PoolMemberPicker({
	chosenTitle,
	availableTitle,
	emptyChosen,
	emptyAvailable,
	chosen,
	available,
	onAdd,
	onRemove,
	onMove,
	unavailable,
}: {
	chosenTitle: string;
	availableTitle: string;
	emptyChosen: string;
	emptyAvailable: string;
	chosen: readonly PoolMemberOption[];
	available: readonly PoolMemberOption[];
	onAdd: (id: string) => void;
	onRemove: (id: string) => void;
	onMove: (index: number, delta: -1 | 1) => void;
	/** Chosen members the form's workspace can't use. */
	unavailable?: UnavailablePicks;
}) {
	return (
		<div className="flex flex-col gap-3 max-w-xl">
			<div>
				<div className={headingClass}>{chosenTitle}</div>
				{chosen.length === 0 ? (
					<p className="rounded-md border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
						{emptyChosen}
					</p>
				) : (
					<ol className="rounded-md border border-border divide-y divide-border">
						{chosen.map((m, i) => (
							<li key={m.id} className="flex items-center gap-2 px-3 py-1.5">
								<span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
									{i + 1}
								</span>
								<MemberLabel option={m} />
								{unavailable?.ids.includes(m.id) && (
									<NotAvailableTag scope={unavailable.scope} />
								)}
								<IconButton
									icon={ArrowUp}
									label={`Move ${m.label} up`}
									disabled={i === 0}
									onClick={() => onMove(i, -1)}
								/>
								<IconButton
									icon={ArrowDown}
									label={`Move ${m.label} down`}
									disabled={i === chosen.length - 1}
									onClick={() => onMove(i, 1)}
								/>
								<IconButton
									icon={X}
									label={`Remove ${m.label}`}
									onClick={() => onRemove(m.id)}
								/>
							</li>
						))}
					</ol>
				)}
			</div>
			<div>
				<div className={headingClass}>{availableTitle}</div>
				{available.length === 0 ? (
					<p className="text-[11px] text-muted-foreground">{emptyAvailable}</p>
				) : (
					<div className="rounded-md border border-border divide-y divide-border overflow-hidden">
						{available.map((m) => (
							<OptionRow key={m.id} onClick={() => onAdd(m.id)}>
								<Plus
									className="size-3.5 shrink-0 text-muted-foreground"
									aria-hidden
								/>
								<MemberLabel option={m} />
							</OptionRow>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function MemberLabel({ option }: { option: PoolMemberOption }) {
	return (
		<span className="flex min-w-0 flex-1 items-baseline gap-2">
			<span className="truncate text-sm text-foreground">{option.label}</span>
			{option.label !== option.name && (
				<span className="truncate font-mono text-[11px] text-muted-foreground">
					{option.name}
				</span>
			)}
			{option.sharedBy !== undefined && (
				<SharedByBadge name={option.sharedBy} />
			)}
			{!option.enabled && <StatusInline enabled={false} />}
		</span>
	);
}
