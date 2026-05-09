import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
}

const SIZE_CLS: Record<NonNullable<ModalProps["size"]>, string> = {
	sm: "w-[420px]",
	md: "w-[560px]",
	lg: "w-[720px]",
};

export function Modal({ open, onClose, title, children, size = "sm" }: ModalProps) {
	const ref = useRef<HTMLDialogElement | null>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	return (
		<dialog
			ref={ref}
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
			className="bg-transparent p-0 m-auto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
		>
			<div className={`${SIZE_CLS[size]} max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-black/10 dark:shadow-black/40`}>
				<div className="h-12 px-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
					<h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="p-4">{children}</div>
			</div>
		</dialog>
	);
}
