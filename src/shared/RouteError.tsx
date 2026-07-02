import { useRouter } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/shared/AlertBanner";

function hasHttpStatus(error: unknown): error is { status: number } {
	return (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof (error as { status: unknown }).status === "number"
	);
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	return "Something went wrong";
}

/**
 * Router-wide fallback for thrown query/loader errors. 403s degrade to a
 * calm "no access" state (matches UsageEmpty/LogsEmpty); everything else
 * gets a compact AlertBanner with a retry.
 */
export function RouteErrorState({ error }: { error: unknown }) {
	const router = useRouter();

	if (hasHttpStatus(error) && error.status === 403) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
				<Lock
					className="mx-auto w-6 h-6 text-muted-foreground/60 mb-2"
					aria-hidden
				/>
				<div className="text-sm font-medium text-foreground">
					You don't have access to this view
				</div>
				<div className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
					An administrator can grant access to this view for your account.
				</div>
			</div>
		);
	}

	return (
		<div className="p-4">
			<AlertBanner severity="error" title={errorMessage(error)}>
				<Button
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={() => router.invalidate()}
				>
					Try again
				</Button>
			</AlertBanner>
		</div>
	);
}
