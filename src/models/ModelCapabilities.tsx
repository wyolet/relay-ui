import {
	Braces,
	Brain,
	Eye,
	FileText,
	Globe,
	Image as ImageIcon,
	KeyRound,
	Layers,
	ListOrdered,
	ListTree,
	type LucideIcon,
	MessageSquare,
	Mic,
	Monitor,
	Paperclip,
	Radio,
	Settings2,
	Volume2,
	Wrench,
	Zap,
} from "lucide-react";

const CAPABILITY_META: Record<string, { icon: LucideIcon; label: string }> = {
	chat: { icon: MessageSquare, label: "Chat" },
	vision: { icon: Eye, label: "Vision" },
	tools: { icon: Wrench, label: "Tool use" },
	parallelTools: { icon: ListOrdered, label: "Parallel tool calls" },
	jsonMode: { icon: Braces, label: "JSON mode" },
	structuredOutput: { icon: ListTree, label: "Structured output" },
	structuredOutputs: { icon: ListTree, label: "Structured outputs" },
	streaming: { icon: Radio, label: "Streaming" },
	reasoning: { icon: Brain, label: "Reasoning" },
	systemMessages: { icon: FileText, label: "System messages" },
	assistantPrefill: { icon: KeyRound, label: "Assistant prefill" },
	fileInput: { icon: Paperclip, label: "File input" },
	embeddings: { icon: Zap, label: "Embeddings" },
	webSearch: { icon: Globe, label: "Web search" },
	computerUse: { icon: Monitor, label: "Computer use" },
	batch: { icon: Layers, label: "Batch" },
	promptCache: { icon: Settings2, label: "Prompt caching" },
	audio: { icon: Volume2, label: "Audio" },
	audioInput: { icon: Mic, label: "Audio input" },
	audioOutput: { icon: Volume2, label: "Audio output" },
};

/** The capabilities a dense row shows, in a fixed order so icons line up. */
const ROW_CAPABILITIES = [
	"tools",
	"vision",
	"reasoning",
	"fileInput",
	"webSearch",
] as const;

/** A dense row's capabilities: icons only, named on hover. */
export function ModelCapabilityIcons({ caps }: { caps: readonly string[] }) {
	const shown = ROW_CAPABILITIES.filter((c) => caps.includes(c));
	return (
		<ul className="flex items-center gap-1.5 text-ink-3">
			{shown.map((c) => {
				const meta = CAPABILITY_META[c] ?? { icon: ImageIcon, label: c };
				const Icon = meta.icon;
				return (
					<li key={c} title={meta.label}>
						<Icon className="size-3.5" aria-label={meta.label} />
					</li>
				);
			})}
		</ul>
	);
}

/** Every capability the model declares, each with its icon and name. */
export function ModelCapabilityList({ caps }: { caps: readonly string[] }) {
	return (
		<ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-label sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
			{caps.map((c) => {
				const meta = CAPABILITY_META[c] ?? { icon: ImageIcon, label: c };
				const Icon = meta.icon;
				return (
					<li key={c} className="flex min-w-0 items-center gap-2">
						<Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
						<span className="truncate text-foreground">{meta.label}</span>
					</li>
				);
			})}
		</ul>
	);
}
