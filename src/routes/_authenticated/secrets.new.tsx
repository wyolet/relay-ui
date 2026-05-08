import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useCreateSecret } from "#/api/hooks/secrets";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { SecretCreate, SecretKind } from "#/api/types/secret";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/secrets/new")({
	component: NewSecretPage,
});

function NewSecretInner() {
	const navigate = useNavigate();
	const createSecret = useCreateSecret();

	const [name, setName] = useState("");
	const [kind, setKind] = useState<SecretKind>("stored");
	const [envVar, setEnvVar] = useState("");
	const [storedValue, setStoredValue] = useState("");
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitted, setSubmitted] = useState(false);

	function validate() {
		const errs: Record<string, string> = {};
		if (!name.trim()) errs.name = "Name is required.";
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
		const trimmedName = name.trim();
		const payload: SecretCreate = {
			name: trimmedName,
			valueFrom:
				kind === "env"
					? { kind: "env", env: envVar.trim() }
					: { kind: "stored", value: storedValue },
		};
		try {
			await createSecret.mutateAsync(payload);
			// SECURITY: cleartext value is never echoed after this point.
			toast("success", `Secret "${trimmedName}" created.`);
			void navigate({
				to: "/secrets/$name",
				params: { name: trimmedName },
			});
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create secret.");
			}
		}
	}

	const errs = submitted ? validate() : fieldErrors;

	return (
		<div>
			<h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
				New Secret
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
				{/* Name */}
				<div>
					<label
						htmlFor="name"
						className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
					>
						Name{" "}
						<span className="ml-1 text-red-500" aria-hidden="true">
							*
						</span>
					</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="openai-key"
						className="w-full border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
					/>
					{errs.name && (
						<p
							role="alert"
							className="mt-1 text-xs text-red-600 dark:text-red-400"
						>
							{errs.name}
						</p>
					)}
				</div>

				{/* Kind toggle */}
				<div>
					<span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
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
										? "bg-brand-600 text-white border-brand-600"
										: "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800",
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
							className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
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
							className="w-full border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
						/>
						<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
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

				{/* Stored value input */}
				{kind === "stored" && (
					<div>
						<label
							htmlFor="stored_value"
							className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
						>
							Secret value{" "}
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
							placeholder="sk-…"
							className="w-full border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
						/>
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

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={createSecret.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
					>
						{createSecret.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						disabled={createSecret.isPending}
						onClick={() => void navigate({ to: "/secrets" })}
						className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function NewSecretPage() {
	return (
		<Suspense
			fallback={
				<div className="text-neutral-500 dark:text-neutral-400 text-sm">Loading…</div>
			}
		>
			<NewSecretInner />
		</Suspense>
	);
}
