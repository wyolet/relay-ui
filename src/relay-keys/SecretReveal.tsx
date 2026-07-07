import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/shared/Toast";

/**
 * Reveal-once secret row: the plaintext shown alongside a copy affordance.
 * Used after a relay key is created or rotated — the server never returns the
 * plaintext again.
 */
export function SecretReveal({ secret }: { secret: string }) {
	return (
		<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
			<code className="flex-1 text-xs font-mono text-foreground break-all">
				{secret}
			</code>
			<CopyButton text={secret} />
		</div>
	);
}

function CopyButton({ text }: { text: string }) {
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
			aria-label="Copy"
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
