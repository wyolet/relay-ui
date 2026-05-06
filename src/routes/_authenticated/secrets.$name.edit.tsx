import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import {
	secretDetailQueryOptions,
	useSecret,
	useUpdateSecret,
} from "#/api/hooks/secrets";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { RateLimitRef } from "#/api/types/ratelimit";
import type { SecretKind, SecretUpdate } from "#/api/types/secret";
import { RateLimitsEditor } from "#/components/RateLimitsEditor";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/secrets/$name/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(
				secretDetailQueryOptions(params.name),
			),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: EditSecretPage,
});

// TODO: When backend confirms that /healthz includes `master_key_configured: boolean`,
// fetch useHealthz() here and disable stored mode with an inline alert if false.
// For now, treat absent field as "available" — stored mode is always enabled.

function EditSecretInner() {
	const { name } = Route.useParams();
	const { data: secret } = useSecret(name);
	const { data: rateLimitsData } = useRateLimits();
	const updateSecret = useUpdateSecret(name);
	const navigate = useNavigate();

	const [kind, setKind] = useState<SecretKind>(secret.spec.kind);
	const [envVar, setEnvVar] = useState(secret.spec.env_var ?? "");
	const [storedValue, setStoredValue] = useState("");
	const [rateLimits, setRateLimits] = useState<RateLimitRef[]>(
		secret.spec.rateLimits ?? [],
	);
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitted, setSubmitted] = useState(false);

	function validate() {
		const errs: Record<string, string> = {};
		if (kind === "env" && !envVar.trim())
			errs.envVar = "Environment variable name is required.";
		if (kind === "stored" && !storedValue.trim())
			errs.storedValue = "Secret value is required.";
		return errs;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitted(true);
		const errs = validate();
		setFieldErrors(errs);
		if (Object.keys(errs).length > 0) return;

		setServerError(undefined);
		const payload: SecretUpdate = {
			spec: {
				value_from:
					kind === "env"
						? { kind: "env", env_var: envVar.trim() }
						: { kind: "stored", value: storedValue },
				rateLimits: rateLimits.length > 0 ? rateLimits : undefined,
			},
		};
		try {
			await updateSecret.mutateAsync(payload);
			// SECURITY: cleartext value is never echoed after this point.
			toast("success", `Secret "${name}" updated.`);
			void navigate({ to: "/secrets/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update secret.");
			}
		}
	}

	const errs = submitted ? validate() : fieldErrors;

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6">
				Edit Secret: <span className="font-mono">{name}</span>
			</h1>

			{serverError && (
				<div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300">
					<p className="font-medium">{serverError.message}</p>
				</div>
			)}

			<form
				onSubmit={(e) => void handleSubmit(e)}
				noValidate
				className="space-y-5 max-w-xl"
			>
				{/* Kind toggle */}
				<div>
					<span className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
						Mode
					</span>
					<div className="flex gap-2">
						{(["stored", "env"] as const).map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => setKind(k)}
								className={[
									"px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
									kind === k
										? "bg-blue-600 text-white border-blue-600"
										: "bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800",
								].join(" ")}
							>
								{k === "stored" ? "Stored value" : "Env var"}
							</button>
						))}
					</div>
				</div>

				{/* Env var input */}
				{kind === "env" && (
					<div>
						<label
							htmlFor="env_var"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							Environment variable name{" "}
							<span className="ml-1 text-red-500" aria-hidden="true">
								*
							</span>
						</label>
						<input
							id="env_var"
							type="text"
							value={envVar}
							onChange={(e) => setEnvVar(e.target.value)}
							placeholder="OPENAI_API_KEY"
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>
						<p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
							Set this env var on your relay deployment.
						</p>
						{errs.envVar && (
							<p
								role="alert"
								className="mt-1 text-xs text-red-600 dark:text-red-400"
							>
								{errs.envVar}
							</p>
						)}
					</div>
				)}

				{/* Stored value input — always required when mode is stored (even on edit, you must re-enter) */}
				{kind === "stored" && (
					<div>
						<label
							htmlFor="stored_value"
							className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
						>
							New secret value{" "}
							<span className="ml-1 text-red-500" aria-hidden="true">
								*
							</span>
						</label>
						<input
							id="stored_value"
							type="password"
							autoComplete="new-password"
							value={storedValue}
							onChange={(e) => setStoredValue(e.target.value)}
							placeholder="Enter new value"
							className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
						/>
						<p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
							The current masked value is:{" "}
							<span className="font-mono">
								{secret.spec.masked_value ?? "—"}
							</span>
						</p>
						{errs.storedValue && (
							<p
								role="alert"
								className="mt-1 text-xs text-red-600 dark:text-red-400"
							>
								{errs.storedValue}
							</p>
						)}
					</div>
				)}

				<RateLimitsEditor
					value={rateLimits}
					onChange={setRateLimits}
					availableRateLimits={rateLimitsData.items.map(
						(rl) => rl.metadata.name,
					)}
				/>

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={updateSecret.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{updateSecret.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						disabled={updateSecret.isPending}
						onClick={() =>
							void navigate({ to: "/secrets/$name", params: { name } })
						}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function EditSecretPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<EditSecretInner />
		</Suspense>
	);
}
