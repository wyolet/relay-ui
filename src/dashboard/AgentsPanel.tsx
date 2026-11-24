import { Link } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { OwnerLink } from "@/projects/OwnerLink";
import { LastUsed } from "@/shared/LastUsed";
import { Section } from "@/shared/Section";
import {
	TABLE_EMPTY,
	TABLE_FOOT,
	TABLE_HEAD_ROW,
	TABLE_ROW,
	WIDE,
} from "./tableRows";
import { useAgentsPanel } from "./useAgentsPanel";

const GRID =
	"grid grid-cols-[minmax(0,1fr)_5rem_4.5rem] items-center gap-x-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_7rem_5rem_4.5rem]";

/** The workspace's agents and what each used in the period, with the way to add one. */
export function AgentsPanel() {
	const { rows, more, period } = useAgentsPanel();
	return (
		<Section
			title="Agents"
			meta={`${period}, by spend`}
			aside={
				<Link
					to="/service-accounts/add-agent"
					className={buttonVariants({ variant: "default", size: "sm" })}
				>
					<Bot data-icon="inline-start" className="size-3.5" />
					Add agent
				</Link>
			}
		>
			{rows.length === 0 ? (
				<p className={TABLE_EMPTY}>
					No agents in this workspace. Add agent makes a service account with
					what it may use and a key of its own.
				</p>
			) : (
				<div className="grid">
					<div className={`${GRID} ${TABLE_HEAD_ROW}`}>
						<span>Name</span>
						<span className={WIDE}>Owner</span>
						<span className={WIDE}>Last request</span>
						<span className="text-right">Spend</span>
						<span className="text-right">Requests</span>
					</div>
					{rows.map((r) => (
						<div key={r.id} className={`${GRID} ${TABLE_ROW}`}>
							<span className="flex min-w-0 items-baseline gap-2">
								<Link
									to="/service-accounts/$name"
									params={{ name: r.name }}
									className="truncate text-foreground hover:underline"
									title={r.label}
								>
									{r.label}
								</Link>
								{!r.enabled && (
									<span className="shrink-0 text-meta text-ink-3">Off</span>
								)}
							</span>
							<span className={`${WIDE} min-w-0 truncate`}>
								<OwnerLink owner={r.owner} showUser />
							</span>
							<LastUsed at={r.lastRequestAt} className={WIDE} />
							<span className="text-right font-medium text-foreground">
								{r.spend}
							</span>
							<span className="text-right text-ink-2">{r.requests}</span>
						</div>
					))}
					<div className={`${TABLE_FOOT} justify-end`}>
						<Link to="/service-accounts" className="hover:text-foreground">
							{more > 0
								? `${more} more in Service accounts →`
								: "Open Service accounts →"}
						</Link>
					</div>
				</div>
			)}
		</Section>
	);
}
