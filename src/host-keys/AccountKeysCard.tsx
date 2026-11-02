import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { UpstreamKeyList } from "@/accounts/UpstreamKeyList";
import type { KeyHealthTone } from "@/host-keys/keyHealth";
import { SecretRotateDialog } from "@/host-keys/SecretRotateDialog";
import {
	type AccountKeyRow,
	useAccountKeyList,
} from "@/host-keys/useAccountKeyList";
import { DeleteConfirm } from "@/shared/DeleteConfirm";
import { DetailCard } from "@/shared/DetailCard";
import { type MenuAction, RowMenu } from "@/shared/RowMenu";

const HEALTH_TONE_CLASS: Record<KeyHealthTone, string> = {
	ok: "text-success",
	warn: "text-warning",
	alert: "text-destructive",
	muted: "text-muted-foreground",
};

/** A provider account's keys, where they are added, rotated, toggled and deleted. */
export function AccountKeysCard({ accountName }: { accountName: string }) {
	const {
		accountId,
		rows,
		setEnabled,
		isToggling,
		rotating,
		openRotate,
		closeRotate,
		del,
		requestDelete,
	} = useAccountKeyList(accountName);

	function actionsFor(row: AccountKeyRow): MenuAction[] {
		const actions: MenuAction[] = [
			{
				label: "Edit",
				render: <Link to="/host-keys/$name/edit" params={{ name: row.name }} />,
			},
		];
		if (row.kind === "stored") {
			actions.push({ label: "Rotate", onClick: () => openRotate(row.hostKey) });
		}
		actions.push(
			{
				label: row.enabled ? "Disable" : "Enable",
				disabled: isToggling,
				onClick: () => setEnabled(row.hostKey, !row.enabled),
			},
			{
				label: "Delete",
				danger: true,
				onClick: () => requestDelete(row.hostKey),
			},
		);
		return actions;
	}

	return (
		<DetailCard
			title={`Keys · ${rows.length}`}
			icon={KeyRound}
			action={
				<Link
					to="/host-keys/new"
					search={{ accountId }}
					className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
				>
					Add key
				</Link>
			}
		>
			<UpstreamKeyList
				keys={rows}
				empty="No keys in this account yet."
				trailing={(row) => (
					<>
						<span
							className={`w-20 text-right text-[11px] ${HEALTH_TONE_CLASS[row.health.tone]}`}
							title={row.health.detail}
						>
							{row.health.label}
						</span>
						<RowMenu actions={actionsFor(row)} />
					</>
				)}
			/>

			{rotating && <SecretRotateDialog hk={rotating} onClose={closeRotate} />}

			{del.target && (
				<DeleteConfirm
					resourceName={del.target.name}
					onConfirm={() => void del.confirm()}
					onCancel={del.cancel}
					isPending={del.isPending}
					error={del.error}
				/>
			)}
		</DetailCard>
	);
}
