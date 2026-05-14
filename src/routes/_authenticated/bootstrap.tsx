/**
 * Bootstrap wizard — first-deployment guided flow (PER-280).
 *
 * Steps:
 *  1. Master Key (or skip to step 3 if env-ref only)
 *  2. First Provider
 *  3. First Secret
 *  4. First Policy
 *  5. First Model
 *  6. Done + Test It
 *
 * State across steps is encoded in URL search params so the wizard
 * is refresh-resilient:
 *   ?step=N&provider=<name>&secret=<name>&pool=<name>&model=<name>&skippedMasterKey=1
 */

import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import { useGenerateMasterKey } from "@/api/hooks/masterKey";
import { useCreateModel } from "@/api/hooks/models";
import {
	policiesListQueryOptions,
	useCreatePolicy,
} from "@/api/hooks/policies";
import {
	providersListQueryOptions,
	useCreateProvider,
} from "@/api/hooks/providers";
import { hostKeysListQueryOptions, useCreateSecret } from "@/api/hooks/hostkeys";
import type { SecretKind } from "@/api/types/hostkey";

// ---------------------------------------------------------------------------
// Search schema & validator
// ---------------------------------------------------------------------------

interface BootstrapSearch {
	step?: number;
	provider?: string;
	secret?: string;
	pool?: string;
	model?: string;
	skippedMasterKey?: number;
}

function validateSearch(raw: Record<string, unknown>): BootstrapSearch {
	const rawStep = typeof raw.step === "number" ? Math.round(raw.step) : 0;
	const step = rawStep >= 1 && rawStep <= 6 ? rawStep : undefined;
	return {
		step,
		provider: typeof raw.provider === "string" ? raw.provider : undefined,
		secret: typeof raw.secret === "string" ? raw.secret : undefined,
		pool: typeof raw.pool === "string" ? raw.pool : undefined,
		model: typeof raw.model === "string" ? raw.model : undefined,
		skippedMasterKey: raw.skippedMasterKey === 1 ? 1 : undefined,
	};
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/_authenticated/bootstrap")({
	validateSearch,
	component: BootstrapPage,
});

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
	{ number: 1, label: "Master Key" },
	{ number: 2, label: "Provider" },
	{ number: 3, label: "Secret" },
	{ number: 4, label: "Policy" },
	{ number: 5, label: "Model" },
	{ number: 6, label: "Done" },
] as const;

// ---------------------------------------------------------------------------
// Stepper rail
// ---------------------------------------------------------------------------

interface StepperProps {
	currentStep: number;
}

function Stepper({ currentStep }: StepperProps) {
	return (
		<nav
			aria-label="Wizard steps"
			className="flex flex-col gap-1 w-48 shrink-0"
		>
			{STEPS.map((s) => {
				const done = s.number < currentStep;
				const active = s.number === currentStep;
				return (
					<div
						key={s.number}
						className={[
							"flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
							active
								? "bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold"
								: done
									? "text-green-700 dark:text-green-400"
									: "text-muted-foreground",
						].join(" ")}
					>
						{done ? (
							<CheckCircle className="w-4 h-4 shrink-0" />
						) : (
							<Circle className="w-4 h-4 shrink-0" />
						)}
						<span>{s.label}</span>
					</div>
				);
			})}
		</nav>
	);
}

// ---------------------------------------------------------------------------
// Step 1 — Master Key
// ---------------------------------------------------------------------------

interface MasterKeyStepProps {
	search: BootstrapSearch;
}

function MasterKeyStep({ search }: MasterKeyStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const generateMutation = useGenerateMasterKey();
	const [confirmed, setConfirmed] = useState(false);
	const [generatedKey, setGeneratedKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	// TODO: re-enable master-key auto-detection once /healthz is back on the
	// control plane (or replaced by a dedicated /control/status endpoint).
	const masterKeyDetected = false;

	function advanceTo(step: number, extra?: Partial<BootstrapSearch>) {
		void navigate({
			search: (prev) => ({ ...prev, step, ...extra }),
			replace: false,
		});
	}

	function handleSkip() {
		advanceTo(3, { skippedMasterKey: 1 });
	}

	function handleGenerate() {
		generateMutation.mutate(undefined, {
			onSuccess: (data) => {
				setGeneratedKey(data.key);
			},
		});
	}

	function handleCopy() {
		if (!generatedKey) return;
		void navigator.clipboard.writeText(generatedKey).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	// Auto-advance once master key is detected
	if (masterKeyDetected && generatedKey && confirmed) {
		advanceTo(2);
	}

	const waitingForDetection =
		generatedKey !== null && confirmed && !masterKeyDetected;

	return (
		<div className="space-y-6 max-w-xl">
			<div>
				<h2 className="text-xl font-bold text-foreground mb-1">
					Master Key Setup
				</h2>
				<p className="text-sm text-muted-foreground">
					Relay can encrypt stored secrets at rest using a master key. Choose
					how you want to manage API credentials.
				</p>
			</div>

			{!generatedKey && (
				<div className="flex flex-col sm:flex-row gap-3">
					<button
						type="button"
						onClick={handleSkip}
						className="flex-1 border border-input rounded-lg px-4 py-3 text-sm text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
					>
						<span className="font-semibold block mb-1">
							Use env-ref secrets only
						</span>
						<span className="text-muted-foreground">
							API keys stay in environment variables. No master key needed.
						</span>
					</button>
					<button
						type="button"
						onClick={handleGenerate}
						disabled={generateMutation.isPending}
						className="flex-1 border-2 border-brand-600 bg-brand-50 dark:bg-brand-950 rounded-lg px-4 py-3 text-sm text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors text-left disabled:opacity-60"
					>
						<span className="font-semibold block mb-1">
							Generate master key
						</span>
						<span className="text-brand-600 dark:text-brand-400">
							Relay encrypts stored secrets. Key is shown once.
						</span>
					</button>
				</div>
			)}

			{generateMutation.isError && (
				<p className="text-destructive text-sm">
					Failed to generate key:{" "}
					{generateMutation.error instanceof Error
						? generateMutation.error.message
						: "Unknown error"}
				</p>
			)}

			{generatedKey && (
				<div className="space-y-4">
					{/* Warning panel */}
					<div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-4">
						<p className="text-sm font-bold text-red-700 dark:text-red-300 mb-1">
							Store this key now — it will never be shown again.
						</p>
						<p className="text-sm text-destructive">
							If you lose this key, all stored secrets become unrecoverable and
							you will need to rotate every API credential manually. Treat it
							like a root password.
						</p>
					</div>

					{/* Copy box */}
					<div className="flex items-center gap-2">
						<code className="flex-1 bg-neutral-900 text-green-400 text-xs rounded-lg px-4 py-3 font-mono break-all select-all">
							{generatedKey}
						</code>
						<button
							type="button"
							onClick={handleCopy}
							className="shrink-0 px-3 py-2 border border-input rounded-lg text-sm text-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>

					{/* Confirm checkbox */}
					<label className="flex items-start gap-3 cursor-pointer">
						<input
							type="checkbox"
							checked={confirmed}
							onChange={(e) => setConfirmed(e.target.checked)}
							className="mt-0.5 h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-brand-600"
						/>
						<span className="text-sm text-foreground">
							I have stored the master key securely.
						</span>
					</label>

					{/* Deployment instructions */}
					{confirmed && (
						<div className="space-y-3">
							<p className="text-sm font-semibold text-foreground">
								Restart your Relay deployment with the master key:
							</p>

							<div>
								<p className="text-xs text-muted-foreground mb-1">
									docker-compose
								</p>
								<pre className="bg-neutral-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
									{`environment:
  RELAY_MASTER_KEY: "${generatedKey}"`}
								</pre>
							</div>

							<div>
								<p className="text-xs text-muted-foreground mb-1">kubectl</p>
								<pre className="bg-neutral-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono whitespace-pre">
									{`kubectl set env deployment/relay \\
  RELAY_MASTER_KEY="${generatedKey}"`}
								</pre>
							</div>
						</div>
					)}

					{/* Waiting for detection */}
					{waitingForDetection && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="w-4 h-4 animate-spin" />
							<span>Waiting for master key to be detected…</span>
						</div>
					)}
				</div>
			)}

			{/* show search context for future steps (hidden state) */}
			<span className="sr-only">{search.step}</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 2 — First Provider
// ---------------------------------------------------------------------------

interface ProviderStepProps {
	search: BootstrapSearch;
}

function ProviderStep({ search }: ProviderStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const createProvider = useCreateProvider();
	const [name, setName] = useState("openai");
	const [kind, setKind] = useState("openai");
	const [baseURL, setBaseURL] = useState("https://api.openai.com");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		createProvider.mutate(
			{ metadata: { name }, spec: { kind, baseURL } },
			{
				onSuccess: () => {
					void navigate({
						search: (prev) => ({ ...prev, step: 3, provider: name }),
						replace: false,
					});
				},
			},
		);
	}

	return (
		<div className="space-y-6 max-w-xl">
			<div>
				<h2 className="text-xl font-bold text-foreground mb-1">
					Add your first Provider
				</h2>
				<p className="text-sm text-muted-foreground">
					A provider connects Relay to an upstream LLM API (e.g. OpenAI, a local
					Ollama instance).
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="provider-name"
					>
						Name
					</label>
					<input
						id="provider-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="provider-kind"
					>
						Kind
					</label>
					<select
						id="provider-kind"
						value={kind}
						onChange={(e) => setKind(e.target.value)}
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					>
						<option value="openai">OpenAI</option>
						<option value="ollama">Ollama</option>
					</select>
				</div>

				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="provider-base-url"
					>
						Base URL
					</label>
					<input
						id="provider-base-url"
						type="url"
						value={baseURL}
						onChange={(e) => setBaseURL(e.target.value)}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
				</div>

				{createProvider.isError && (
					<p className="text-destructive text-sm">
						{createProvider.error instanceof Error
							? createProvider.error.message
							: "Failed to create provider"}
					</p>
				)}

				<button
					type="submit"
					disabled={createProvider.isPending || !name || !baseURL}
					className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
				>
					{createProvider.isPending ? "Creating…" : "Next →"}
				</button>
			</form>

			<span className="sr-only">{search.step}</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 3 — First Secret
// ---------------------------------------------------------------------------

interface SecretStepProps {
	search: BootstrapSearch;
}

function SecretStep({ search }: SecretStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const createSecret = useCreateSecret();
	// TODO: derive from a control-plane status endpoint when available.
	const masterKeyConfigured = false;

	const [name, setName] = useState("openai-key");
	const [kind, setKind] = useState<SecretKind>("env");
	const [envVar, setEnvVar] = useState("OPENAI_API_KEY");
	const [storedValue, setStoredValue] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const valueFrom =
			kind === "env"
				? { kind: "env" as const, env: envVar }
				: { kind: "stored" as const, value: storedValue };

		createSecret.mutate(
			{ name, valueFrom },
			{
				onSuccess: () => {
					void navigate({
						search: (prev) => ({ ...prev, step: 4, secret: name }),
						replace: false,
					});
				},
			},
		);
	}

	return (
		<div className="space-y-6 max-w-xl">
			<div>
				<h2 className="text-xl font-bold text-foreground mb-1">
					Add your first Secret
				</h2>
				<p className="text-sm text-muted-foreground">
					Secrets hold API credentials used by policies to authenticate with
					providers.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="secret-name"
					>
						Name
					</label>
					<input
						id="secret-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div>
					<span className="block text-sm font-medium text-foreground mb-2">
						Mode
					</span>
					<div className="flex gap-3">
						<label className="flex items-center gap-2 cursor-pointer">
							<input
								type="radio"
								name="secret-kind"
								value="env"
								checked={kind === "env"}
								onChange={() => setKind("env")}
							/>
							<span className="text-sm text-foreground">
								Environment variable
							</span>
						</label>
						<label
							className={[
								"flex items-center gap-2",
								masterKeyConfigured
									? "cursor-pointer"
									: "opacity-40 cursor-not-allowed",
							].join(" ")}
						>
							<input
								type="radio"
								name="secret-kind"
								value="stored"
								checked={kind === "stored"}
								onChange={() => setKind("stored")}
								disabled={!masterKeyConfigured}
							/>
							<span className="text-sm text-foreground">
								Stored (encrypted)
								{!masterKeyConfigured && (
									<span className="ml-1 text-xs text-muted-foreground">
										— requires master key
									</span>
								)}
							</span>
						</label>
					</div>
				</div>

				{kind === "env" ? (
					<div>
						<label
							className="block text-sm font-medium text-foreground mb-1"
							htmlFor="secret-env-var"
						>
							Environment variable name
						</label>
						<input
							id="secret-env-var"
							type="text"
							value={envVar}
							onChange={(e) => setEnvVar(e.target.value)}
							required
							className="w-full rounded-lg border border-input px-3 py-2 text-sm font-mono bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
						/>
						<p className="mt-1 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
							Make sure to set this environment variable on your Relay
							deployment.
						</p>
					</div>
				) : (
					<div>
						<label
							className="block text-sm font-medium text-foreground mb-1"
							htmlFor="secret-value"
						>
							API Key
						</label>
						<input
							id="secret-value"
							type="password"
							value={storedValue}
							onChange={(e) => setStoredValue(e.target.value)}
							required
							placeholder="sk-..."
							className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
						/>
					</div>
				)}

				{createSecret.isError && (
					<p className="text-destructive text-sm">
						{createSecret.error instanceof Error
							? createSecret.error.message
							: "Failed to create secret"}
					</p>
				)}

				<button
					type="submit"
					disabled={
						createSecret.isPending ||
						!name ||
						(kind === "env" ? !envVar : !storedValue)
					}
					className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
				>
					{createSecret.isPending ? "Creating…" : "Next →"}
				</button>
			</form>

			<span className="sr-only">{search.step}</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 4 — First Policy
// ---------------------------------------------------------------------------

interface PoolStepProps {
	search: BootstrapSearch;
}

function PoolStep({ search }: PoolStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const createPool = useCreatePolicy();

	const providersQuery = useSuspenseQuery(providersListQueryOptions);
	const secretsQuery = useSuspenseQuery(hostKeysListQueryOptions);

	const [name, setName] = useState("default");
	const [provider, setProvider] = useState(
		search.provider ??
			(providersQuery.data.items ?? [])[0]?.metadata.name ??
			"",
	);
	const [selectedSecrets, setSelectedSecrets] = useState<string[]>(
		search.secret ? [search.secret] : [],
	);

	function toggleSecret(secretName: string) {
		setSelectedSecrets((prev) =>
			prev.includes(secretName)
				? prev.filter((s) => s !== secretName)
				: [...prev, secretName],
		);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		createPool.mutate(
			{
				metadata: { name },
				spec: {
					provider,
					secrets: selectedSecrets.length > 0 ? selectedSecrets : null,
				},
			},
			{
				onSuccess: () => {
					void navigate({
						search: (prev) => ({ ...prev, step: 5, pool: name }),
						replace: false,
					});
				},
			},
		);
	}

	return (
		<div className="space-y-6 max-w-xl">
			<div>
				<h2 className="text-xl font-bold text-foreground mb-1">
					Create your first Policy
				</h2>
				<p className="text-sm text-muted-foreground">
					A policy binds a provider with one or more secrets and is the unit
					Relay uses to route requests.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="pool-name"
					>
						Name
					</label>
					<input
						id="pool-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="pool-provider"
					>
						Provider
					</label>
					<select
						id="pool-provider"
						value={provider}
						onChange={(e) => setProvider(e.target.value)}
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					>
						{(providersQuery.data.items ?? []).map((p) => (
							<option key={p.metadata.name} value={p.metadata.name}>
								{p.metadata.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<span className="block text-sm font-medium text-foreground mb-2">
						Secrets
					</span>
					<div className="space-y-2">
						{(secretsQuery.data.items ?? []).map((s) => (
							<label
								key={s.name}
								className="flex items-center gap-2 cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedSecrets.includes(s.name)}
									onChange={() => toggleSecret(s.name)}
									className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-brand-600"
								/>
								<span className="text-sm text-foreground">{s.name}</span>
							</label>
						))}
						{(secretsQuery.data.items ?? []).length === 0 && (
							<p className="text-sm text-muted-foreground">No secrets found.</p>
						)}
					</div>
				</div>

				{createPool.isError && (
					<p className="text-destructive text-sm">
						{createPool.error instanceof Error
							? createPool.error.message
							: "Failed to create policy"}
					</p>
				)}

				<button
					type="submit"
					disabled={createPool.isPending || !name || !provider}
					className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
				>
					{createPool.isPending ? "Creating…" : "Next →"}
				</button>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 5 — First Model
// ---------------------------------------------------------------------------

interface ModelStepProps {
	search: BootstrapSearch;
}

function ModelStep({ search }: ModelStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const createModel = useCreateModel();

	const providersQuery = useSuspenseQuery(providersListQueryOptions);

	const defaultProvider =
		search.provider ??
		(providersQuery.data.items ?? [])[0]?.metadata.name ??
		"";
	const [name, setName] = useState("gpt-4o");
	const [provider, setProvider] = useState(defaultProvider);
	const [upstreamName, setUpstreamName] = useState("gpt-4o");

	// Keep upstream_name in sync with name unless user has diverged them
	const [upstreamTouched, setUpstreamTouched] = useState(false);

	function handleNameChange(val: string) {
		setName(val);
		if (!upstreamTouched) setUpstreamName(val);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		createModel.mutate(
			{
				metadata: { name },
				spec: { provider, upstreamName },
			},
			{
				onSuccess: () => {
					void navigate({
						search: (prev) => ({ ...prev, step: 6, model: name }),
						replace: false,
					});
				},
			},
		);
	}

	return (
		<div className="space-y-6 max-w-xl">
			<div>
				<h2 className="text-xl font-bold text-foreground mb-1">
					Add your first Model
				</h2>
				<p className="text-sm text-muted-foreground">
					Models map a friendly alias to an upstream model identifier served by
					a provider.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="model-name"
					>
						Alias (used in API calls)
					</label>
					<input
						id="model-name"
						type="text"
						value={name}
						onChange={(e) => handleNameChange(e.target.value)}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
				</div>

				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="model-provider"
					>
						Provider
					</label>
					<select
						id="model-provider"
						value={provider}
						onChange={(e) => setProvider(e.target.value)}
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					>
						{(providersQuery.data.items ?? []).map((p) => (
							<option key={p.metadata.name} value={p.metadata.name}>
								{p.metadata.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<label
						className="block text-sm font-medium text-foreground mb-1"
						htmlFor="model-upstream"
					>
						Upstream model name
					</label>
					<input
						id="model-upstream"
						type="text"
						value={upstreamName}
						onChange={(e) => {
							setUpstreamName(e.target.value);
							setUpstreamTouched(true);
						}}
						required
						className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
					<p className="mt-1 text-xs text-muted-foreground">
						e.g. gpt-4o, llama3.2, mistral
					</p>
				</div>

				{createModel.isError && (
					<p className="text-destructive text-sm">
						{createModel.error instanceof Error
							? createModel.error.message
							: "Failed to create model"}
					</p>
				)}

				<button
					type="submit"
					disabled={
						createModel.isPending || !name || !provider || !upstreamName
					}
					className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60"
				>
					{createModel.isPending ? "Creating…" : "Finish →"}
				</button>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Step 6 — Done + Test It
// ---------------------------------------------------------------------------

const BASE_URL =
	typeof window !== "undefined"
		? window.location.origin
		: "http://localhost:8080";

interface ChatMessage {
	role: "assistant";
	content: string;
}

interface ChatCompletionResponse {
	choices: Array<{
		message: ChatMessage;
	}>;
}

function isChatCompletionResponse(val: unknown): val is ChatCompletionResponse {
	if (typeof val !== "object" || val === null) return false;
	const obj = val as Record<string, unknown>;
	if (!Array.isArray(obj.choices)) return false;
	const first = obj.choices[0];
	if (typeof first !== "object" || first === null) return false;
	const firstObj = first as Record<string, unknown>;
	if (typeof firstObj.message !== "object" || firstObj.message === null)
		return false;
	return true;
}

interface DoneStepProps {
	search: BootstrapSearch;
}

function DoneStep({ search }: DoneStepProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const [prompt, setPrompt] = useState("say hello");
	const [response, setResponse] = useState<string | null>(null);
	const [testError, setTestError] = useState<string | null>(null);
	const [isSending, setIsSending] = useState(false);

	const modelName = search.model ?? "gpt-4o";

	async function handleTest(e: React.FormEvent) {
		e.preventDefault();
		setResponse(null);
		setTestError(null);
		setIsSending(true);
		try {
			const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model: modelName,
					messages: [{ role: "user", content: prompt }],
				}),
			});
			if (!res.ok) {
				const text = await res.text();
				setTestError(`HTTP ${res.status}: ${text}`);
				return;
			}
			const data: unknown = await res.json();
			if (isChatCompletionResponse(data)) {
				setResponse(data.choices[0]?.message.content ?? "(empty response)");
			} else {
				setTestError("Unexpected response shape from /v1/chat/completions");
			}
		} catch (err) {
			setTestError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setIsSending(false);
		}
	}

	return (
		<div className="space-y-8 max-w-xl">
			<div className="flex items-start gap-3">
				<CheckCircle className="w-10 h-10 text-green-500 shrink-0 mt-0.5" />
				<div>
					<h2 className="text-2xl font-bold text-foreground mb-1">
						You&apos;re all set!
					</h2>
					<p className="text-sm text-muted-foreground">
						Relay is configured with a provider, secret, policy, and model. Send
						a test prompt to confirm everything is wired up.
					</p>
				</div>
			</div>

			{/* Test card */}
			<div className="rounded-xl border border-border bg-card p-6 space-y-4">
				<h3 className="font-semibold text-foreground">Test it</h3>
				<p className="text-xs text-muted-foreground">
					Model: <code className="font-mono">{modelName}</code> — via{" "}
					<code className="font-mono">/v1/chat/completions</code>
				</p>
				<form onSubmit={handleTest} className="flex gap-2">
					<input
						type="text"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						required
						placeholder="Enter a prompt…"
						className="flex-1 rounded-lg border border-input px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus-visible:ring-ring"
					/>
					<button
						type="submit"
						disabled={isSending || !prompt}
						className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center gap-2"
					>
						{isSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
						Send
					</button>
				</form>

				{response && (
					<div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3">
						<p className="text-sm text-green-900 dark:text-green-300 whitespace-pre-wrap">
							{response}
						</p>
					</div>
				)}

				{testError && (
					<div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
						<p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
							{testError}
						</p>
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={() => void navigate({ to: "/" })}
				className="px-5 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
			>
				Go to dashboard
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Resume logic — compute which step to start at based on server state
// ---------------------------------------------------------------------------

interface ResumeComputerProps {
	initialSearch: BootstrapSearch;
}

function ResumeComputer({ initialSearch }: ResumeComputerProps) {
	const navigate = useNavigate({ from: "/bootstrap" });
	const providersQuery = useSuspenseQuery(providersListQueryOptions);
	const poolsQuery = useSuspenseQuery(policiesListQueryOptions);
	const secretsQuery = useSuspenseQuery(hostKeysListQueryOptions);

	const hasProviders = (providersQuery.data.items ?? []).length > 0;
	const hasPools = (poolsQuery.data.items ?? []).length > 0;
	const hasSecrets = (secretsQuery.data.items ?? []).length > 0;

	// If catalog is non-empty and no explicit step param, redirect to dashboard
	if (
		initialSearch.step === undefined &&
		hasProviders &&
		hasPools &&
		hasSecrets
	) {
		void navigate({ to: "/", replace: true });
		return null;
	}

	// Compute resume step
	if (initialSearch.step === undefined) {
		let resumeStep = 1;
		if (hasProviders && !hasSecrets) resumeStep = 3;
		else if (hasProviders && hasSecrets && !hasPools) resumeStep = 4;
		else if (hasProviders && hasSecrets && hasPools) resumeStep = 5;

		void navigate({
			search: (prev) => ({ ...prev, step: resumeStep }),
			replace: true,
		});
		return null;
	}

	return null;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function BootstrapInner() {
	const search = useSearch({ from: "/_authenticated/bootstrap" });

	// Render current step content
	function stepContent() {
		switch (search.step) {
			case 1:
				return <MasterKeyStep search={search} />;
			case 2:
				return <ProviderStep search={search} />;
			case 3:
				return <SecretStep search={search} />;
			case 4:
				return (
					<Suspense
						fallback={
							<div className="text-muted-foreground text-sm">Loading…</div>
						}
					>
						<PoolStep search={search} />
					</Suspense>
				);
			case 5:
				return (
					<Suspense
						fallback={
							<div className="text-muted-foreground text-sm">Loading…</div>
						}
					>
						<ModelStep search={search} />
					</Suspense>
				);
			case 6:
				return <DoneStep search={search} />;
			default:
				// step === undefined means resume computer is still computing
				return <div className="text-muted-foreground text-sm">Loading…</div>;
		}
	}

	return (
		<>
			{search.step === undefined && (
				<Suspense>
					<ResumeComputer initialSearch={search} />
				</Suspense>
			)}
			<div className="flex gap-10">
				<Stepper currentStep={search.step ?? 1} />
				<div className="flex-1 min-w-0">{stepContent()}</div>
			</div>
		</>
	);
}

function BootstrapPage() {
	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-8">Setup Wizard</h1>
			<BootstrapInner />
		</div>
	);
}
