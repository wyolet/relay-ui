import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { type AllowEditKey, useEditPermissions } from "@/stores/permissions";

export const Route = createFileRoute("/_authenticated/settings/permissions")({
	component: PermissionsSettingsPage,
});

const ITEMS: { key: AllowEditKey; label: string; description: string }[] = [
	{
		key: "host-owned-policies",
		label: "Host-owned policies",
		description:
			"Allow editing policies a host created and manages. Off by default to avoid clobbering host-managed state.",
	},
	{
		key: "models",
		label: "Synced models",
		description:
			"Allow editing models synced from a provider catalog. Local edits may be overwritten on the next sync.",
	},
	{
		key: "providers",
		label: "Synced providers",
		description:
			"Allow editing upstream-synced provider records. Local edits may be overwritten on the next sync.",
	},
	{
		key: "hosts",
		label: "Synced hosts",
		description:
			"Allow editing upstream-synced host records. Local edits may be overwritten on the next sync.",
	},
];

function PermissionsSettingsPage() {
	const { flags, setAllowEdit } = useEditPermissions();

	return (
		<div className="flex flex-col">
			<div>
				<Link
					to="/settings"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Settings
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					Edit permissions
				</h1>
				<p className="mt-1 text-xs text-muted-foreground max-w-2xl">
					Server-managed resources are read-only by default so you don't
					accidentally clobber synced or host-owned state. Unlock editing per
					category here. Stored in this browser only.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				{ITEMS.map((item) => (
					<div
						key={item.key}
						className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-8 py-6 first:pt-0 last:pb-0"
					>
						<div className="md:pt-0.5">
							<div className="flex items-center gap-2">
								<ShieldCheck
									className="w-3.5 h-3.5 text-muted-foreground shrink-0"
									aria-hidden="true"
								/>
								<h2 className="text-sm font-semibold text-foreground">
									{item.label}
								</h2>
							</div>
							<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
								{item.description}
							</p>
						</div>
						<div className="min-w-0 inline-flex items-center gap-2.5">
							<Switch
								checked={flags[item.key]}
								onCheckedChange={(c) => setAllowEdit(item.key, c)}
								aria-label={`Allow editing ${item.label}`}
							/>
							<span className="text-sm text-foreground">
								{flags[item.key] ? "Editable" : "Locked"}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
