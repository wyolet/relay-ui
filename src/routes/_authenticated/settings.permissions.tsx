import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import {
	type GovernanceSection,
	governanceQueryOptions,
	useGovernance,
	useUpdateGovernance,
} from "@/api/hooks/governance";
import { ApiError } from "@/api/types/errors";
import {
	governanceToLevel,
	levelToGovernance,
	type PermissionLevel,
} from "@/lib/ownership";
import { PermissionLevelSwitch } from "@/shared/PermissionLevelSwitch";
import { PageLoader } from "@/shared/Spinner";
import { toast } from "@/shared/Toast";

const SECTIONS: {
	section: GovernanceSection;
	label: string;
	description: string;
}[] = [
	{
		section: "policy",
		label: "Host-owned policies",
		description:
			"Policies a host created and manages. Editing defaults on; deleting off to avoid clobbering host-managed state.",
	},
	{
		section: "model",
		label: "Synced models",
		description:
			"Models synced from a provider catalog. Local changes may be overwritten on the next sync.",
	},
	{
		section: "provider",
		label: "Synced providers",
		description:
			"Upstream-synced provider records. Local changes may be overwritten on the next sync.",
	},
	{
		section: "host",
		label: "Synced hosts",
		description:
			"Upstream-synced host records. Local changes may be overwritten on the next sync.",
	},
];

export const Route = createFileRoute("/_authenticated/settings/permissions")({
	loader: ({ context }) =>
		Promise.all(
			SECTIONS.map((s) =>
				context.queryClient.ensureQueryData(governanceQueryOptions(s.section)),
			),
		),
	component: PermissionsSettingsPage,
});

function PermissionsSettingsPage() {
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
					Server-managed resources guard against accidental edits and deletes so
					you don't clobber synced or host-owned state. Unlock per category
					here. System-owned rows stay protected regardless; these flags apply
					to catalog-managed rows and are enforced by the relay.
				</p>
			</div>

			<div className="mt-6 divide-y divide-border">
				<Suspense fallback={<PageLoader />}>
					{SECTIONS.map((s) => (
						<GovernanceRow
							key={s.section}
							section={s.section}
							label={s.label}
							description={s.description}
						/>
					))}
				</Suspense>
			</div>
		</div>
	);
}

function GovernanceRow({
	section,
	label,
	description,
}: {
	section: GovernanceSection;
	label: string;
	description: string;
}) {
	const gov = useGovernance(section);
	const update = useUpdateGovernance(section);
	const level = governanceToLevel(gov);

	async function setLevel(next: PermissionLevel) {
		try {
			await update.mutateAsync(levelToGovernance(next));
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError
					? err.body.message
					: "Failed to update permissions.",
			);
		}
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-8 py-6 first:pt-0 last:pb-0">
			<div className="md:pt-0.5">
				<div className="flex items-center gap-2">
					<ShieldCheck
						className="w-3.5 h-3.5 text-muted-foreground shrink-0"
						aria-hidden="true"
					/>
					<h2 className="text-sm font-semibold text-foreground">{label}</h2>
				</div>
				<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
					{description}
				</p>
			</div>
			<div className="min-w-0 flex flex-col gap-2">
				<PermissionLevelSwitch
					value={level}
					onChange={(next) => void setLevel(next)}
					disabled={update.isPending}
					ariaLabel={`Permission level for ${label}`}
				/>
				<p className="text-[11px] text-muted-foreground">
					{level === "delete"
						? "Editing and deleting allowed."
						: level === "write"
							? "Editing allowed; deleting locked."
							: "Read-only — editing and deleting locked."}
				</p>
			</div>
		</div>
	);
}
