import type { ReactNode } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	size?: "sm" | "md" | "lg";
}

const SIZE_CLS: Record<NonNullable<ModalProps["size"]>, string> = {
	sm: "sm:max-w-md",
	md: "sm:max-w-xl",
	lg: "sm:max-w-3xl",
};

export function Modal({
	open,
	onClose,
	title,
	children,
	size = "sm",
}: ModalProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
		>
			<DialogContent className={SIZE_CLS[size]}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
}
