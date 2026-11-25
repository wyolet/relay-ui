import type { ReactNode } from "react";

/** A field's visible label above it, with an optional quiet note at its end. */
export function FieldLabel({
	htmlFor,
	hint,
	children,
}: {
	htmlFor: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="mb-1.5 flex items-baseline justify-between gap-2">
			<label htmlFor={htmlFor} className="text-meta font-medium text-ink-2">
				{children}
			</label>
			{hint && <span className="text-foot text-ink-3">{hint}</span>}
		</div>
	);
}
