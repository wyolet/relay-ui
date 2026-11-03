import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { notAvailableLabel } from "@/lib/workContext";
import { Chip } from "@/shared/Chip";

/**
 * A picker over an owner-scoped list: "Updating for <scope>…" above while it
 * still shows the last workspace's rows, and the unavailable-picks error below.
 */
export function ScopedPicker({
	updatingFor,
	error,
	children,
}: {
	updatingFor: string | undefined;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div>
			{updatingFor && (
				<p role="status" className="mb-1.5 text-[11px] text-muted-foreground">
					Updating for {updatingFor}…
				</p>
			)}
			{children}
			{error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
		</div>
	);
}

/** The inline mark on a picked row the form's workspace can't use. */
export function NotAvailableTag({ scope }: { scope: string }) {
	return (
		<span className="shrink-0 text-[11px] text-warning">
			{notAvailableLabel(scope)}
		</span>
	);
}

/** A chip-shaped pick the workspace can't use, removable in one click. */
export function UnavailableChip({
	label,
	scope,
	onRemove,
}: {
	label: string;
	scope: string;
	onRemove: () => void;
}) {
	return (
		<Chip
			shape="box"
			label={`${label} · ${notAvailableLabel(scope)}`}
			onRemove={onRemove}
			className="border-warning/40 text-warning"
		/>
	);
}

/** Under a single-select whose pick the workspace can't use: the mark and a remove. */
export function UnavailablePick({
	scope,
	onRemove,
}: {
	scope: string;
	onRemove: () => void;
}) {
	return (
		<p className="mt-1.5 flex items-center gap-2">
			<NotAvailableTag scope={scope} />
			<Button type="button" variant="link" size="inline" onClick={onRemove}>
				Remove
			</Button>
		</p>
	);
}
