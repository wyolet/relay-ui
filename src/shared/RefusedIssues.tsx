import { AlertBanner } from "@/shared/AlertBanner";

/** The plan issues relay would refuse a one-request write for. */
export function RefusedIssues({
	messages,
}: {
	messages: readonly string[] | undefined;
}) {
	if (!messages?.length) return null;
	return (
		<div role="alert" className="max-w-2xl">
			<AlertBanner severity="error" title="Relay would refuse this setup">
				<ul className="mt-0.5 flex flex-col gap-0.5">
					{messages.map((m) => (
						<li key={m}>{m}</li>
					))}
				</ul>
			</AlertBanner>
		</div>
	);
}
