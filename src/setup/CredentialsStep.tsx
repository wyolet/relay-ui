import { useState } from "react";
import type { Host } from "@/api/types/host";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderBadge } from "./ProviderBadge";
import type { ProviderDef } from "./providerCatalog";
import { wizardGhost, wizardPrimary } from "./ui";

interface CredentialsStepProps {
	provider: ProviderDef;
	host: Host;
	modelCount: number;
	busy: boolean;
	error: string | null;
	onBack: () => void;
	onSubmit: (input: { apiKey: string; baseURL: string }) => void;
}

export function CredentialsStep({
	provider,
	host,
	modelCount,
	busy,
	error,
	onBack,
	onSubmit,
}: CredentialsStepProps) {
	const [apiKey, setApiKey] = useState("");
	const [baseURL, setBaseURL] = useState(
		host.spec.baseURL || provider.defaultBaseURL || "",
	);

	// Non-local providers require a key; Ollama can run unauthenticated.
	const canSubmit = provider.local
		? baseURL.trim().length > 0
		: apiKey.trim().length > 0;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || busy) return;
		onSubmit({ apiKey, baseURL });
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			<header className="flex items-center gap-4">
				<ProviderBadge def={provider} host={host} size={44} />
				<div>
					<h2 className="text-xl font-bold text-foreground">
						Connect {provider.label}
					</h2>
					<p className="text-xs text-muted-foreground">
						{modelCount > 0
							? `${modelCount} models will become available through Relay.`
							: "Models will appear once the credential is stored."}
					</p>
				</div>
			</header>

			{provider.local && (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="setup-base-url">Base URL</Label>
					<Input
						id="setup-base-url"
						value={baseURL}
						onChange={(e) => setBaseURL(e.target.value)}
						placeholder="http://host.docker.internal:11434"
						autoComplete="off"
						spellCheck={false}
					/>
					<p className="text-[11px] text-muted-foreground">
						Relay runs in a container, so <code>localhost</code> won't reach
						your host. On Docker Desktop use{" "}
						<code>http://host.docker.internal:11434</code>; on native Linux use
						your host's LAN IP (or run relay with <code>--network=host</code>).
					</p>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="setup-api-key">{provider.keyLabel}</Label>
				<Input
					id="setup-api-key"
					type="password"
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
					placeholder={provider.keyPlaceholder}
					autoComplete="off"
					spellCheck={false}
					autoFocus
				/>
				{provider.keyDocsUrl && (
					<a
						href={provider.keyDocsUrl}
						target="_blank"
						rel="noreferrer"
						className="w-fit text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
					>
						Where do I find this? →
					</a>
				)}
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}

			<div className="flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					className={wizardGhost}
					onClick={onBack}
					disabled={busy}
				>
					← Back
				</Button>
				<Button
					type="submit"
					className={wizardPrimary}
					disabled={!canSubmit || busy}
				>
					{busy ? "Connecting…" : "Continue"}
				</Button>
			</div>
		</form>
	);
}
