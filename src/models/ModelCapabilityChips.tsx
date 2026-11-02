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

export function ModelCapabilityChips({ caps }: { caps: string[] }) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{caps.map((c) => {
				const meta = CAPABILITY_META[c] ?? { icon: ImageIcon, label: c };
				const Icon = meta.icon;
				return (
					<li
						key={c}
						className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border"
					>
						<Icon className="w-3 h-3" aria-hidden />
						{meta.label}
					</li>
				);
			})}
		</ul>
	);
}
