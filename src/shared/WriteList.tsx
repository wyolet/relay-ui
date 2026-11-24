import { Check, Circle, X } from "lucide-react";
import type { WriteStatus } from "@/hooks/useWriteRunner";
import { Spinner } from "@/shared/Spinner";

export interface WriteListItem {
	id: string;
	label: string;
	status: WriteStatus;
}

function StatusIcon({ status }: { status: WriteStatus }) {
	if (status === "done") {
		return (
			<Check className="size-3.5 text-primary" role="img" aria-label="Done" />
		);
	}
	if (status === "running") return <Spinner className="size-3.5" />;
	if (status === "failed") {
		return (
			<X className="size-3.5 text-destructive" role="img" aria-label="Failed" />
		);
	}
	return (
		<Circle
			className="size-3.5 text-muted-foreground/50"
			role="img"
			aria-label="Waiting"
		/>
	);
}

/** The requests a multi-write form sends, in order, each with where it stands. */
export function WriteList({
	items,
	error,
}: {
	items: readonly WriteListItem[];
	/** Why the failed item failed. */
	error?: string | null;
}) {
	return (
		<ol className="flex max-w-md flex-col gap-2">
			{items.map((item) => (
				<li key={item.id} className="flex items-start gap-2.5 text-xs">
					<span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
						<StatusIcon status={item.status} />
					</span>
					<span className="min-w-0">
						<span
							className={
								item.status === "waiting"
									? "text-muted-foreground"
									: "text-foreground"
							}
						>
							{item.label}
						</span>
						{item.status === "failed" && error && (
							<span
								role="alert"
								className="mt-0.5 block text-[11px] text-destructive"
							>
								{error}
							</span>
						)}
					</span>
				</li>
			))}
		</ol>
	);
}
