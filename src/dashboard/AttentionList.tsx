import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	type AttentionItem,
	type AttentionTarget,
	useAttention,
} from "./useAttention";
import { AUTH_STATUSES, THROTTLED_STATUSES } from "./useOpsAttention";

/** One line per thing to act on; a single quiet line when nothing is. */
export function AttentionList() {
	const { items, checking } = useAttention();

	if (items.length === 0) {
		return (
			<p className="text-label text-ink-2">
				{checking ? "Checking credentials…" : "All clear."}
			</p>
		);
	}

	return (
		<ul className="grid">
			{items.map((item) => (
				<li key={item.key} className="border-b border-rule last:border-b-0">
					<AttentionLine item={item} />
				</li>
			))}
		</ul>
	);
}

function AttentionLine({ item }: { item: AttentionItem }) {
	const body = (
		<>
			<span
				className={cn(
					"size-2 shrink-0 rounded-full",
					item.tone === "alert" ? "bg-destructive" : "bg-warn",
				)}
				aria-hidden
			/>
			<span className="min-w-0 flex-1 truncate" title={item.text}>
				{item.text}
			</span>
		</>
	);
	const className =
		"group flex items-center gap-2.5 py-2.5 text-label text-foreground";

	if (item.target.kind === "none") {
		return <div className={className}>{body}</div>;
	}
	return (
		<TargetLink target={item.target} className={className}>
			{body}
			<ArrowRight
				className="size-3.5 shrink-0 text-ink-3 group-hover:text-foreground"
				aria-hidden
			/>
		</TargetLink>
	);
}

function TargetLink({
	target,
	className,
	children,
}: {
	target: Exclude<AttentionTarget, { kind: "none" }>;
	className: string;
	children: React.ReactNode;
}) {
	switch (target.kind) {
		case "hostKey":
			return (
				<Link
					to="/host-keys/$name"
					params={{ name: target.name }}
					className={className}
				>
					{children}
				</Link>
			);
		case "hostErrors":
			return (
				<Link
					to="/logs"
					search={{ host_id: [target.hostId], errors: true, since: "24h" }}
					className={className}
				>
					{children}
				</Link>
			);
		case "throttled":
			return (
				<Link
					to="/logs"
					search={{ status: THROTTLED_STATUSES, since: "24h" }}
					className={className}
				>
					{children}
				</Link>
			);
		case "refused":
			return (
				<Link
					to="/logs"
					search={{ status: AUTH_STATUSES, since: "24h" }}
					className={className}
				>
					{children}
				</Link>
			);
		case "denied":
			return (
				<Link
					to="/audit"
					search={{ span: "24h", outcome: "denied" }}
					className={className}
				>
					{children}
				</Link>
			);
		case "pricing":
			return (
				<Link to="/pricing" className={className}>
					{children}
				</Link>
			);
		case "key":
			return (
				<Link
					to="/keys/$name"
					params={{ name: target.name }}
					className={className}
				>
					{children}
				</Link>
			);
	}
}
