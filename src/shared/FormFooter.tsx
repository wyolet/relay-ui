import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Action bar pinned to the bottom of a page; bleeds over the page's 6-unit gutter. */
export function StickyFooter({ children }: { children: ReactNode }) {
	return (
		<div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border mt-6 -mx-6 px-6 py-3 flex items-center justify-end gap-2">
			{children}
		</div>
	);
}

/** Cancel + Create / Save changes footer of a resource form page. */
export function FormFooter({
	isEdit,
	isSubmitting,
	onCancel,
}: {
	isEdit: boolean;
	isSubmitting: boolean;
	onCancel: () => void;
}) {
	return (
		<StickyFooter>
			<Button type="button" variant="outline" size="lg" onClick={onCancel}>
				Cancel
			</Button>
			<Button type="submit" variant="cta" size="lg" disabled={isSubmitting}>
				{isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
			</Button>
		</StickyFooter>
	);
}
