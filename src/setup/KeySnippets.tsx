import { useEffect, useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./CodeBlock";
import { API_SHAPES, type ApiShape, DEFAULT_SHAPE } from "./shapes";
import { buildSnippets } from "./snippets";

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

/** The API shape whose snippets are shown; the caller names its base URL. */
export function useApiShape() {
	const [shapeId, setShapeId] = useState(DEFAULT_SHAPE.id);
	const shape = API_SHAPES.find((s) => s.id === shapeId) ?? DEFAULT_SHAPE;
	return { shape, setShape: (next: ApiShape) => setShapeId(next.id) };
}

/** A first call with the key, per client, cycling through `models`. */
export function KeySnippets({
	plaintext,
	models,
	shape,
	onShapeChange,
}: {
	plaintext: string;
	/** Values a request sends as `model`. */
	models: readonly string[];
	shape: ApiShape;
	onShapeChange: (shape: ApiShape) => void;
}) {
	// Templates are stable (per key + adapter); only the spliced model/prompt
	// values rotate, on slightly different beats so they never sync up.
	const snippets = useMemo(
		() => buildSnippets(plaintext, shape.adapter),
		[plaintext, shape.adapter],
	);
	const model = useRotating(models.length > 0 ? models : ["your-model"], 5200);
	const message = useRotating(SAMPLE_PROMPTS, 7400);

	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3">
				<p className="text-xs font-medium text-foreground">
					Make your first call
				</p>
				{API_SHAPES.length > 1 && (
					<Select
						value={shape.id}
						items={Object.fromEntries(API_SHAPES.map((s) => [s.id, s.label]))}
						onValueChange={(v) => {
							const next = API_SHAPES.find((s) => s.id === v);
							if (next) onShapeChange(next);
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
						<CodeBlock snippet={s} model={model} message={message} />
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
