import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { useKeysStore } from "@/stores/keys";

export const Route = createFileRoute("/_authenticated/keys/$id")({
	component: KeyDetailPage,
});

function timeAgo(iso: string | null): string {
	if (iso === null) return "—";
	const t = new Date(iso).getTime();
	const diff = Date.now() - t;
	const sec = Math.round(diff / 1_000);
	if (sec < 60) return `${sec}s ago`;
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.round(hr / 24);
	if (day < 30) return `${day}d ago`;
	const mo = Math.round(day / 30);
	return `${mo}mo ago`;
}

function fmtFull(iso: string | null): string {
	if (iso === null) return "—";
	return new Date(iso).toLocaleString();
}

interface FieldRowProps {
	label: string;
	children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
	return (
		<div className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-3">
			<dt className="text-sm text-muted-foreground">{label}</dt>
			<dd className="text-sm text-foreground min-w-0">{children}</dd>
		</div>
	);
}

function KeyDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const k = useKeysStore((s) => s.items.find((x) => x.id === id));
	const revoke = useKeysStore((s) => s.revoke);
	const [confirming, setConfirming] = useState(false);

	if (k === undefined) {
		return (
			<div>
				<Link
					to="/keys"
					search={{ filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline mb-4"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to keys
				</Link>
				<p className="text-sm text-muted-foreground">Key not found.</p>
			</div>
		);
	}

	const revoked = k.revokedAt !== null;

	function handleRevoke() {
		revoke(id);
		toast("success", `Key "${k?.name}" revoked.`);
		setConfirming(false);
		void navigate({
			to: "/keys",
			search: { filter: "active", q: "" },
		});
	}

	return (
		<div>
			<Link
				to="/keys"
				search={{ filter: "active", q: "" }}
				className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline mb-4"
			>
				<ArrowLeft className="w-4 h-4" />
				Back to keys
			</Link>

			<div className="flex items-start justify-between mb-6 gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className={[
								"w-2 h-2 rounded-full",
								revoked ? "bg-neutral-300 dark:bg-neutral-700" : "bg-brand-500",
							].join(" ")}
						/>
						<h1 className="text-2xl font-bold text-foreground truncate">
							{k.name}
						</h1>
						{revoked && (
							<span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
								revoked
							</span>
						)}
					</div>
					<p className="text-sm font-mono text-neutral-500 dark:text-neutral-500 mt-0.5">
						{k.prefix}…
					</p>
				</div>
				{!revoked &&
					(confirming ? (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setConfirming(false)}
								className="h-9 px-3 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleRevoke}
								className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-red-600 hover:bg-red-700 text-sm font-semibold text-white transition-colors"
							>
								<Trash2 className="w-4 h-4" />
								Confirm revoke
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setConfirming(true)}
							className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-destructive hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
						>
							<Trash2 className="w-4 h-4" />
							Revoke
						</button>
					))}
			</div>

			<div className="rounded-lg border border-border bg-card divide-y divide-border mb-6">
				<FieldRow label="Last used">
					<span className="tabular-nums">
						{timeAgo(k.lastUsedAt)}
						{k.lastUsedAt !== null && (
							<span className="text-muted-foreground/70 ml-2">
								{fmtFull(k.lastUsedAt)}
							</span>
						)}
					</span>
				</FieldRow>
				<FieldRow label="Created">
					<span className="tabular-nums">
						{timeAgo(k.createdAt)}
						<span className="text-muted-foreground/70 ml-2">
							{fmtFull(k.createdAt)}
						</span>
					</span>
				</FieldRow>
				{revoked && (
					<FieldRow label="Revoked">
						<span className="tabular-nums">
							{timeAgo(k.revokedAt)}
							<span className="text-muted-foreground/70 ml-2">
								{fmtFull(k.revokedAt)}
							</span>
						</span>
					</FieldRow>
				)}
			</div>

			<section>
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Usage
				</h2>
				<div className="rounded-lg border border-dashed border-input bg-card px-6 py-10 flex flex-col items-center text-center">
					<BarChart3 className="w-6 h-6 mb-3 text-muted-foreground/50" />
					<p className="text-sm font-medium text-foreground">
						Usage charts coming soon
					</p>
					<p className="text-sm text-muted-foreground mt-1 max-w-md">
						Per-key request volume, latency, and spend will appear here once the
						control plane exposes a metrics endpoint.
					</p>
				</div>
			</section>
		</div>
	);
}
