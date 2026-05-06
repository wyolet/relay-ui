import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useCreatePool } from "#/api/hooks/pools";
import { providersListQueryOptions, useProviders } from "#/api/hooks/providers";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "#/api/hooks/ratelimits";
import { secretsListQueryOptions, useSecrets } from "#/api/hooks/secrets";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { PoolCreate } from "#/api/types/pool";
import type { RateLimitAttachment } from "#/api/types/ratelimit";
import { RateLimitsEditor } from "#/components/RateLimitsEditor";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/pools/new")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: NewPoolPage,
});

function NewPoolFormInner() {
	const navigate = useNavigate();
	const createPool = useCreatePool();
	const { data: secretsData } = useSecrets();
	const { data: providersData } = useProviders();
	const { data: rateLimitsData } = useRateLimits();

	const [name, setName] = useState("");
	const [provider, setProvider] = useState("");
	const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
	const [secretSearch, setSecretSearch] = useState("");
	const [rateLimits, setRateLimits] = useState<RateLimitAttachment[]>([]);
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [submitted, setSubmitted] = useState(false);

	const nameError = submitted && !name.trim() ? "Name is required" : undefined;
	const providerError =
		submitted && !provider ? "Provider is required" : undefined;

	function toggleSecret(secretName: string) {
		setSelectedSecrets((prev) =>
			prev.includes(secretName)
				? prev.filter((s) => s !== secretName)
				: [...prev, secretName],
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitted(true);
		if (!name.trim() || !provider) return;

		setServerError(undefined);
		const payload: PoolCreate = {
			metadata: { name: name.trim() },
			spec: {
				provider,
				secrets: selectedSecrets.length > 0 ? selectedSecrets : null,
				rateLimits: rateLimits.length > 0 ? rateLimits : undefined,
			},
		};
		try {
			await createPool.mutateAsync(payload);
			toast("success", `Pool "${payload.metadata.name}" created.`);
			void navigate({
				to: "/pools/$name",
				params: { name: payload.metadata.name },
			});
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create pool.");
			}
		}
	}

	const allSecrets = secretsData.items ?? [];
	const filteredSecrets = allSecrets.filter((s) =>
		s.name.toLowerCase().includes(secretSearch.toLowerCase()),
	);

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-6">
				New Pool
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
				<div>
					<label
						htmlFor="name"
						className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
					>
						Name <span className="text-red-500">*</span>
					</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="my-pool"
						className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
					{nameError && (
						<p
							role="alert"
							className="mt-1 text-xs text-red-600 dark:text-red-400"
						>
							{nameError}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="provider"
						className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
					>
						Provider <span className="text-red-500">*</span>
					</label>
					<select
						id="provider"
						value={provider}
						onChange={(e) => setProvider(e.target.value)}
						className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
					>
						<option value="">— select —</option>
						{(providersData.items ?? []).map((p) => (
							<option key={p.metadata.name} value={p.metadata.name}>
								{p.metadata.name}
							</option>
						))}
					</select>
					{providerError && (
						<p
							role="alert"
							className="mt-1 text-xs text-red-600 dark:text-red-400"
						>
							{providerError}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="secret-search"
						className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
					>
						Secrets
					</label>
					<input
						id="secret-search"
						type="search"
						placeholder="Search secrets…"
						value={secretSearch}
						onChange={(e) => setSecretSearch(e.target.value)}
						className="w-full border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
					/>
					{filteredSecrets.length === 0 ? (
						<p className="text-sm text-gray-500 dark:text-zinc-400">
							No secrets found.
						</p>
					) : (
						<div className="flex flex-wrap gap-2">
							{filteredSecrets.map((s) => {
								const checked = selectedSecrets.includes(s.name);
								return (
									<label
										key={s.name}
										className={[
											"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-colors",
											checked
												? "bg-blue-600 text-white border-blue-600"
												: "bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800",
										].join(" ")}
									>
										<input
											type="checkbox"
											className="sr-only"
											checked={checked}
											onChange={() => toggleSecret(s.name)}
										/>
										{s.name}
									</label>
								);
							})}
						</div>
					)}
				</div>

				<RateLimitsEditor
					value={rateLimits}
					onChange={setRateLimits}
					availableRateLimits={(rateLimitsData.items ?? []).map(
						(rl) => rl.metadata.name,
					)}
				/>

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={createPool.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{createPool.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						onClick={() => void navigate({ to: "/pools" })}
						disabled={createPool.isPending}
						className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function NewPoolPage() {
	return (
		<Suspense
			fallback={
				<div className="text-gray-500 dark:text-zinc-400 text-sm">Loading…</div>
			}
		>
			<NewPoolFormInner />
		</Suspense>
	);
}
