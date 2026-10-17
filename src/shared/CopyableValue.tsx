import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/shared/Toast";

/**
 * A value shown in full beside a copy affordance: a reveal-once secret the
 * server never returns again, or a URL to paste into another system.
 */
export function CopyableValue({
	value,
	copyLabel = "Copy",
}: {
	value: string;
	copyLabel?: string;
}) {
	return (
		<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
			<code className="flex-1 text-xs font-mono text-foreground break-all">
				{value}
			</code>
			<CopyButton text={value} label={copyLabel} />
		</div>
	);
}

function CopyButton({ text, label }: { text: string; label: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_500);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-lg"
			onClick={() => void handleCopy()}
			aria-label={label}
			className="text-muted-foreground"
		>
			{copied ? (
				<Check className="size-4 text-primary" />
			) : (
				<Copy className="size-4" />
			)}
		</Button>
	);
}
