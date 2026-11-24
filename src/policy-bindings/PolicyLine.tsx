import { ShieldCheck } from "lucide-react";
import { POLICY_SET_ABOVE_LINE } from "@/policy-bindings/ownPolicy";

/** What the target is under now, above the fields that replace it. */
export function PolicyLine({ line }: { line: string }) {
	return (
		<p className="flex items-center gap-2 text-xs text-muted-foreground">
			<ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
			{line}
		</p>
	);
}

/** In place of a form: the target's policy is held above the caller, with relay's own words on why. */
export function PolicySetAbove({ message }: { message?: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<PolicyLine line={POLICY_SET_ABOVE_LINE} />
			{message && <p className="text-xs text-muted-foreground">{message}</p>}
		</div>
	);
}
