import { AlertBanner, type AlertSeverity } from "@/shared/AlertBanner";

/** An {@link AlertBanner} listing messages one per line; nothing when there are none. */
export function MessagesBanner({
	severity,
	title,
	messages,
	role,
}: {
	severity: AlertSeverity;
	title: string;
	messages: readonly string[] | undefined;
	/** `alert` for what stops the form, `status` for what doesn't. */
	role: "alert" | "status";
}) {
	if (!messages?.length) return null;
	return (
		<div role={role} className="max-w-2xl">
			<AlertBanner severity={severity} title={title}>
				<ul className="mt-0.5 flex flex-col gap-0.5">
					{messages.map((m) => (
						<li key={m}>{m}</li>
					))}
				</ul>
			</AlertBanner>
		</div>
	);
}
