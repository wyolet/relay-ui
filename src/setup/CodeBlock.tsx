import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
	code: string;
}

/** Read-only code surface with a one-tap copy button. */
export function CodeBlock({ code }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className="relative">
			<pre className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-[12px] leading-relaxed text-foreground">
				<code>{code}</code>
			</pre>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="absolute right-2 top-2 h-7"
				onClick={() => void copy()}
			>
				{copied ? "Copied" : "Copy"}
			</Button>
		</div>
	);
}
