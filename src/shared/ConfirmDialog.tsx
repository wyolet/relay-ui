import { useSyncExternalStore } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}

function subscribe(l: () => void) {
	listeners.add(l);
	return () => {
		listeners.delete(l);
	};
}

function getSnapshot(): ConfirmRequest | null {
	return current;
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
	// If something else is open, dismiss it as canceled.
	if (current) current.resolve(false);
	return new Promise((resolve) => {
		current = { ...opts, resolve };
		emit();
	});
}

function close(value: boolean) {
	const req = current;
	if (!req) return;
	current = null;
	emit();
	req.resolve(value);
}

export function ConfirmDialogHost() {
	const req = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	const open = req !== null;
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) close(false);
			}}
		>
			{req && (
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{req.title}</AlertDialogTitle>
						{req.description && (
							<AlertDialogDescription>{req.description}</AlertDialogDescription>
						)}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => close(false)}>
							{req.cancelLabel ?? "Cancel"}
						</AlertDialogCancel>
						<AlertDialogAction
							variant={req.danger ? "destructive" : "default"}
							onClick={() => close(true)}
						>
							{req.confirmLabel ?? "Confirm"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			)}
		</AlertDialog>
	);
}
