import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./CodeBlock";
import { API_SHAPES, DEFAULT_SHAPE } from "./shapes";
import { buildSnippets, relayBaseUrl } from "./snippets";
import { wizardGhost, wizardPrimary } from "./ui";
import type { CreatedKey, SampleModel } from "./useSetupWizard";

interface SuccessStepProps {
	apiKey: CreatedKey;
	models: SampleModel[];
	onAddAnother: () => void;
	onFinish: () => void;
}

// Original sample prompts cycled through the snippet to make it feel alive.
const SAMPLE_PROMPTS = [
	"Hello from Relay",
	"Explain transformers like I'm five.",
	"Write a haiku about fast inference.",
	"Give me three startup name ideas.",
	"Summarize how TCP works in one sentence.",
	"Tell me a joke about latency.",
	"What's a fun fact about the color violet?",
	"Draft a commit message for a logo redesign.",
];

// Cycle through items on an interval; static when there's nothing to rotate.
function useRotating<T>(items: readonly T[], intervalMs: number): T {
	const [index, setIndex] = useState(0);
	useEffect(() => {
		if (items.length <= 1) return;
		const id = window.setInterval(
			() => setIndex((i) => (i + 1) % items.length),
			intervalMs,
		);
		return () => window.clearInterval(id);
	}, [items.length, intervalMs]);
	return items[index % items.length] ?? items[0];
}

export function SuccessStep({
	apiKey,
	models,
	onAddAnother,
	onFinish,
}: SuccessStepProps) {
	const [copiedKey, setCopiedKey] = useState(false);
	const [shapeId, setShapeId] = useState(DEFAULT_SHAPE.id);
	const shape = API_SHAPES.find((s) => s.id === shapeId) ?? DEFAULT_SHAPE;

	// Templates are stable (per key + adapter); only the spliced model/prompt
	// values rotate, on slightly different beats so they never sync up.
	const snippets = useMemo(
		() => buildSnippets(apiKey.plaintext, shape.adapter),
		[apiKey.plaintext, shape.adapter],
	);
	const modelValues =
		models.length > 0 ? models.map((m) => m.value) : ["your-model"];
	const model = useRotating(modelValues, 5200);
	const message = useRotating(SAMPLE_PROMPTS, 7400);

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

			<div>
				<div className="mb-2 flex items-center justify-between gap-3">
					<p className="text-xs font-medium text-foreground">
						Make your first call
					</p>
					<div className="flex items-center gap-2">
						{API_SHAPES.length > 1 && (
							<Select
								value={shapeId}
								items={Object.fromEntries(
									API_SHAPES.map((s) => [s.id, s.label]),
								)}
								onValueChange={(v) => {
									if (v === null) return;
									const next = API_SHAPES.find((s) => s.id === v);
									if (next) setShapeId(next.id);
								}}
							>
								<SelectTrigger size="sm" className="w-auto text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{API_SHAPES.map((s) => (
										<SelectItem key={s.id} value={s.id}>
											{s.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</div>
				<Tabs defaultValue="curl">
					<TabsList>
						{snippets.map((s) => (
							<TabsTrigger key={s.id} value={s.id}>
								{s.label}
							</TabsTrigger>
						))}
					</TabsList>
					{snippets.map((s) => (
						<TabsContent key={s.id} value={s.id}>
							<CodeBlock
								template={s.template}
								model={model}
								message={message}
							/>
						</TabsContent>
					))}
				</Tabs>
			</div>

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
