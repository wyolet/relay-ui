import { middleTruncate } from "@/lib/middleTruncate";
import { toast } from "@/shared/Toast";

/** A long id shown short; hover shows it whole, a click copies it. A bare
 * button: it reads as inline text, not as one of the button controls. */
export function ShortId({ value }: { value: string }) {
	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			toast("success", "Copied.");
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void copy()}
			title={`${value} · click to copy`}
			className="cursor-copy font-mono text-[11px] text-muted-foreground hover:text-foreground"
		>
			{middleTruncate(value)}
		</button>
	);
}
