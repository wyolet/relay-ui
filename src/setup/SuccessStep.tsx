import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KeySnippets, useApiShape } from "./KeySnippets";
import { relayBaseUrl } from "./snippets";
import { wizardGhost, wizardPrimary } from "./ui";
import type { CreatedKey, SampleModel } from "./useSetupWizard";

interface SuccessStepProps {
	apiKey: CreatedKey;
	models: SampleModel[];
	onAddAnother: () => void;
	onFinish: () => void;
}

export function SuccessStep({
	apiKey,
	models,
	onAddAnother,
	onFinish,
}: SuccessStepProps) {
	const [copiedKey, setCopiedKey] = useState(false);
	const { shape, setShape } = useApiShape();

	async function copyKey() {
		try {
			await navigator.clipboard.writeText(apiKey.plaintext);
			setCopiedKey(true);
			window.setTimeout(() => setCopiedKey(false), 1500);
		} catch {
			setCopiedKey(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<header className="text-center">
				<h2 className="text-2xl font-bold text-foreground">
					You're all set 🎉
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Point any OpenAI-compatible client at{" "}
					<code className="text-foreground">{relayBaseUrl(shape.adapter)}</code>{" "}
					with the key below.
				</p>
			</header>

			<div className="rounded-xl border border-border bg-background p-4">
				<div className="mb-1 flex items-center justify-between">
					<span className="text-xs font-medium text-foreground">Your key</span>
					<span className="text-[11px] text-destructive">
						Shown once — copy it now
					</span>
				</div>
				<div className="flex items-center gap-2">
					<code className="flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-[12px] text-foreground">
						{apiKey.plaintext}
					</code>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-9"
						onClick={() => void copyKey()}
					>
						{copiedKey ? "Copied" : "Copy"}
					</Button>
				</div>
			</div>

			<KeySnippets
				plaintext={apiKey.plaintext}
				models={models.map((m) => m.value)}
				shape={shape}
				onShapeChange={setShape}
			/>

			<div className="flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					className={wizardGhost}
					onClick={onAddAnother}
				>
					+ Add another provider
				</Button>
				<Button type="button" className={wizardPrimary} onClick={onFinish}>
					Go to dashboard →
				</Button>
			</div>
		</div>
	);
}
