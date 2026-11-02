import { ExternalLink, Sliders } from "lucide-react";
import type { Host } from "@/api/types/host";
import { DetailCard, DetailEmpty, DetailRow } from "@/shared/DetailCard";

export function HostConfigurationTab({ host }: { host: Host }) {
	const backendEntries = Object.entries(host.spec.backend ?? {});

	return (
		<div className="flex flex-col gap-4 pt-2">
			<DetailCard title="Connection" icon={Sliders}>
				<dl className="divide-y divide-border">
					<DetailRow label="Base URL">
						{host.spec.baseURL ? (
							<code className="font-mono text-xs text-foreground break-all">
								{host.spec.baseURL}
							</code>
						) : (
							<span className="text-muted-foreground">—</span>
						)}
					</DetailRow>
				</dl>
			</DetailCard>

			<DetailCard title="External links" icon={ExternalLink}>
				<dl className="divide-y divide-border">
					<UrlRow label="Console" url={host.spec.consoleURL} />
					<UrlRow label="Docs" url={host.spec.docsURL} />
					<UrlRow label="Homepage" url={host.spec.homepageURL} />
					<UrlRow label="Status page" url={host.spec.statusPageURL} />
				</dl>
			</DetailCard>

			<DetailCard title="Backend config" icon={Sliders}>
				{backendEntries.length === 0 ? (
					<DetailEmpty>No provider-specific backend settings.</DetailEmpty>
				) : (
					<dl className="divide-y divide-border">
						{backendEntries.map(([k, v]) => (
							<DetailRow key={k} label={k}>
								<code className="font-mono text-xs text-foreground break-all">
									{v}
								</code>
							</DetailRow>
						))}
					</dl>
				)}
			</DetailCard>
		</div>
	);
}

function UrlRow({ label, url }: { label: string; url: string | undefined }) {
	return (
		<DetailRow label={label}>
			{url ? (
				<a
					href={url}
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
				>
					{url}
					<ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
				</a>
			) : (
				<span className="text-muted-foreground">—</span>
			)}
		</DetailRow>
	);
}
