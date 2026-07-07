import { Pencil, Power, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

// The one detail-page header action trio: Enable/Disable · (Edit) · Delete,
// all `size="lg"`. Every resource detail view rendered this by hand, byte for
// byte; the only real differences were the edit route, the gating booleans, and
// the odd extra action (Rotate). Those become props so the trio can't drift.
//
// The edit link is a render prop — routes are strongly typed per page, so the
// caller supplies the <Link> and this hands it the shared className + content.
export function DetailHeaderActions({
	enabled,
	onToggle,
	toggling,
	showToggle = true,
	editLink,
	onDelete,
	deleting,
	showDelete = true,
	children,
}: {
	enabled: boolean;
	onToggle: () => void;
	toggling?: boolean;
	showToggle?: boolean;
	/** Typed edit <Link>; receives the shared button className + inner content. */
	editLink?: (opts: { className: string; content: ReactNode }) => ReactNode;
	onDelete?: () => void;
	deleting?: boolean;
	showDelete?: boolean;
	/** Extra actions between Enable/Disable and Edit (e.g. Rotate). */
	children?: ReactNode;
}) {
	return (
		<div className="flex items-center gap-2 shrink-0">
			{showToggle && (
				<Button
					type="button"
					variant="outline"
					size="lg"
					onClick={onToggle}
					disabled={toggling}
				>
					<Power className="size-3.5" />
					{enabled ? "Disable" : "Enable"}
				</Button>
			)}
			{children}
			{editLink?.({
				className: buttonVariants({ variant: "outline", size: "lg" }),
				content: (
					<>
						<Pencil className="size-3.5" />
						Edit
					</>
				),
			})}
			{showDelete && onDelete && (
				<Button
					type="button"
					variant="destructive"
					size="lg"
					onClick={onDelete}
					disabled={deleting}
				>
					<Trash2 className="size-3.5" />
					Delete
				</Button>
			)}
		</div>
	);
}
