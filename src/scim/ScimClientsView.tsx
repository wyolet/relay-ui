import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useScimClients } from "@/api/hooks/scimClients";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/shared/AlertBanner";
import { CopyableValue } from "@/shared/CopyableValue";
import { StatusBadge } from "@/shared/StatusBadge";
import { TableToolbar } from "@/shared/TableToolbar";
import { ScimClientCreateDialog } from "./ScimClientCreateDialog";
import { ScimClientsTable } from "./ScimClientsTable";
import { ScimTokenDialog } from "./ScimTokenDialog";
import { useScimClientActions } from "./useScimClientActions";
import { SCIM_BASE_URL, useScimStatus } from "./useScimStatus";

export function ScimClientsView() {
	const { data: clients } = useScimClients();
	const { enabled, disabledWithClients } = useScimStatus(clients);
	const actions = useScimClientActions();
	const [creating, setCreating] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			{disabledWithClients && (
				<AlertBanner severity="warn" title="SCIM provisioning is disabled">
					<p className="text-xs text-muted-foreground">
						These clients' tokens do nothing until it's on: /scim/v2 answers
						404.{" "}
						<Link
							to="/settings/scim"
							className="underline hover:text-foreground"
						>
							Enable it in settings
						</Link>
						.
					</p>
				</AlertBanner>
			)}

			<div className="rounded-lg border border-border bg-card p-4">
				<div className="mb-2 flex items-center justify-between gap-3">
					<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						Base URL for the identity provider
					</span>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<StatusBadge enabled={enabled} />
						<Link
							to="/settings/scim"
							className="underline hover:text-foreground"
						>
							Settings
						</Link>
					</div>
				</div>
				<CopyableValue value={SCIM_BASE_URL} copyLabel="Copy base URL" />
			</div>

			<div>
				<TableToolbar
					actions={
						<Button size="lg" onClick={() => setCreating(true)}>
							<Plus className="w-3.5 h-3.5" />
							New client
						</Button>
					}
				/>
				<ScimClientsTable
					clients={clients}
					busy={actions.busy}
					onRotate={actions.rotateClient}
					onRevoke={actions.revokeClient}
				/>
			</div>

			{creating && (
				<ScimClientCreateDialog
					clients={clients}
					onClose={() => setCreating(false)}
					onCreated={(client) => {
						setCreating(false);
						actions.showIssued(client);
					}}
				/>
			)}
			{actions.issued && (
				<ScimTokenDialog
					issued={actions.issued}
					onClose={actions.dismissIssued}
				/>
			)}
		</div>
	);
}
