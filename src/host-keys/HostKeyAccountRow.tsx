import { Link } from "@tanstack/react-router";
import { ScanSearch } from "lucide-react";
import { DefaultAccountBadge } from "@/accounts/DefaultAccountBadge";
import { Button } from "@/components/ui/button";
import {
	type DetectedOrganization,
	useHostKeyAccountDetection,
} from "@/host-keys/useHostKeyAccountDetection";
import type { HostKeyAccountView } from "@/host-keys/useHostKeyDetail";
import { DetailInline } from "@/shared/DetailCard";
import { ShortId } from "@/shared/ShortId";

interface HostKeyAccountRowProps {
	hostKeyId: string;
	account: HostKeyAccountView | null;
}

/** The key's account, with an on-demand check of the organization its host names. */
export function HostKeyAccountRow({
	hostKeyId,
	account,
}: HostKeyAccountRowProps) {
	const { detect, isPending, detected, errorMessage } =
		useHostKeyAccountDetection(hostKeyId);

	return (
		<div className="flex flex-col gap-2">
			<DetailInline>
				{account ? (
					<Link
						to="/accounts/$name"
						params={{ name: account.name }}
						className="text-foreground hover:underline"
					>
						{account.label}
					</Link>
				) : (
					<span className="text-muted-foreground">— (none set)</span>
				)}
				{account?.isDefault && <DefaultAccountBadge />}
				{account?.orgId && <ShortId value={account.orgId} />}
				<Button
					type="button"
					variant="outline"
					onClick={detect}
					disabled={isPending}
				>
					<ScanSearch className="size-3" />
					{isPending ? "Detecting…" : "Detect account"}
				</Button>
			</DetailInline>
			<p className="text-[11px] text-muted-foreground leading-snug">
				Keys of one account share its upstream limits, and the policy bound to
				the account caps them.
			</p>
			{detected && <DetectionResult detected={detected} />}
			{errorMessage && (
				<p className="text-[11px] text-destructive">{errorMessage}</p>
			)}
		</div>
	);
}

function DetectionResult({ detected }: { detected: DetectedOrganization }) {
	const org = detected.orgName
		? `${detected.orgName} (${detected.orgId})`
		: detected.orgId;
	const { verdict } = detected;
	return (
		<div className="text-[11px] leading-snug">
			<p className="text-foreground">
				The host names organization <span className="font-mono">{org}</span>.
			</p>
			{verdict.kind === "in-place" ? (
				<p className="text-success">
					The key sits in this organization's account.
				</p>
			) : (
				<p className="text-warning">
					{verdict.kind === "elsewhere"
						? `The key sits in an account of another organization; "${verdict.matchingLabel}" holds this one.`
						: "No account of this key's owner at the host holds this organization."}{" "}
					Moving the key is a normal edit of its account field.
				</p>
			)}
		</div>
	);
}
