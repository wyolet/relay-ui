import { motion } from "motion/react";
import { highlight } from "sugar-high";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MODEL_PLACEHOLDER, MSG_PLACEHOLDER } from "./snippets";

interface CodeBlockProps {
	/** Snippet code with the model/prompt placeholders. */
	template: string;
	/** Current model pointer (rendered as a quoted string). */
	model: string;
	/** Current prompt (rendered as a JSON string). */
	message: string;
}

// sugar-high emits <span style="color: var(--sh-*)">. Violet-mono "hue-spread"
// theme: brand violets for keywords/numbers, indigo strings + magenta classes
// for separation, neutral identifiers/comments. Theme-aware — deep on light
// surfaces, bright on dark. The indigo/magenta have no design token, so they're
// literal hex; everything else rides the brand/semantic tokens. ~1KB, no grammars.
const SH_TOKENS = [
	"[--sh-keyword:var(--color-brand-700)] dark:[--sh-keyword:var(--color-brand-300)]",
	"[--sh-jsxliterals:var(--color-brand-600)] dark:[--sh-jsxliterals:var(--color-brand-400)]",
	"[--sh-string:#4f5bd0] dark:[--sh-string:#9aa6f5]",
	"[--sh-class:#9442cf] dark:[--sh-class:#cda0f0]",
	"[--sh-property:#9442cf] dark:[--sh-property:#cda0f0]",
	"[--sh-entity:#9442cf] dark:[--sh-entity:#cda0f0]",
	"[--sh-identifier:var(--foreground)]",
	"[--sh-sign:var(--muted-foreground)]",
	"[--sh-comment:var(--muted-foreground)]",
].join(" ");

const MODEL_MARK = "@@MODEL_SLOT@@";
const MSG_MARK = "@@MSG_SLOT@@";
const MODEL_SPAN = new RegExp(
	`<span class="sh__token--[a-z]+"[^>]*>${MODEL_PLACEHOLDER}</span>`,
);
const MSG_SPAN = new RegExp(
	`<span class="sh__token--[a-z]+"[^>]*>${MSG_PLACEHOLDER}</span>`,
);

interface Segment {
	key: string;
	/** A control mark, or a chunk of static highlighted HTML. */
	value: string;
}

// Highlight once, then carve out the (whole) placeholder spans so the static
// HTML around them never re-renders — only the spliced value spans animate.
function segmentize(template: string): Segment[] {
	const marked = highlight(template)
		.replace(MODEL_SPAN, MODEL_MARK)
		.replace(MSG_SPAN, MSG_MARK);
	let offset = 0;
	return marked
		.split(/(@@MODEL_SLOT@@|@@MSG_SLOT@@)/)
		.filter((v) => v !== "")
		.map((value) => {
			const seg = { key: `s${offset}`, value };
			offset += value.length || 1;
			return seg;
		});
}

function ValueSpan({ text }: { text: string }) {
	return (
		<motion.span
			key={text}
			initial={{ opacity: 0.15, filter: "blur(2px)" }}
			animate={{ opacity: 1, filter: "blur(0px)" }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			style={{ color: "var(--sh-string)" }}
		>
			{text}
		</motion.span>
	);
}

/** Read-only snippet with syntax highlighting; only the model/prompt animate. */
export function CodeBlock({ template, model, message }: CodeBlockProps) {
	const [copied, setCopied] = useState(false);
	const segments = useMemo(() => segmentize(template), [template]);

	const modelText = `"${model}"`;
	const messageText = JSON.stringify(message);
	const fullCode = template
		.replace(MODEL_PLACEHOLDER, modelText)
		.replace(MSG_PLACEHOLDER, messageText);

	async function copy() {
		try {
			await navigator.clipboard.writeText(fullCode);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	}

	return (
		<div className="relative">
			<pre
				className={`overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-[12px] leading-relaxed text-foreground ${SH_TOKENS}`}
			>
				<code>
					{segments.map((seg) => {
						if (seg.value === MODEL_MARK)
							return <ValueSpan key="model" text={modelText} />;
						if (seg.value === MSG_MARK)
							return <ValueSpan key="message" text={messageText} />;
						return (
							<span
								key={seg.key}
								// biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high output is escaped HTML
								dangerouslySetInnerHTML={{ __html: seg.value }}
							/>
						);
					})}
				</code>
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
