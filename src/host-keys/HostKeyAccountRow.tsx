import { ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	type DetectedOrganization,
	useHostKeyAccountDetection,
} from "@/host-keys/useHostKeyAccountDetection";
import type { HostKeyAccountView } from "@/host-keys/useHostKeyDetail";

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
			<div className="flex items-center gap-2 flex-wrap">
				{account ? (
					<span className="text-foreground">{account.label}</span>
				) : (
					<span className="text-muted-foreground">— (none set)</span>
				)}
				{account?.isDefault && (
					<span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
						default
					</span>
				)}
				{account?.orgId && (
					<code className="font-mono text-[11px] text-muted-foreground">
						{account.orgId}
					</code>
				)}
				<Button
					type="button"
					variant="outline"
					onClick={detect}
					disabled={isPending}
				>
					<ScanSearch className="size-3" />
					{isPending ? "Detecting…" : "Detect account"}
				</Button>
			</div>
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
