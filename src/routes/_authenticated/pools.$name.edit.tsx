import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import {
	poolDetailQueryOptions,
	usePool,
	useUpdatePool,
} from "@/api/hooks/pools";
import { providersListQueryOptions, useProviders } from "@/api/hooks/providers";
import {
	rateLimitsListQueryOptions,
	useRateLimits,
} from "@/api/hooks/ratelimits";
import { secretsListQueryOptions, useSecrets } from "@/api/hooks/secrets";
import type { ApiErrorBody } from "@/api/types/errors";
import { ApiError } from "@/api/types/errors";
import type { PoolUpdate } from "@/api/types/pool";
import type { RateLimitAttachment } from "@/api/types/ratelimit";
import { RateLimitsEditor } from "@/components/RateLimitsEditor";
import { toast } from "@/components/Toast";

export const Route = createFileRoute("/_authenticated/pools/$name/edit")({
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(poolDetailQueryOptions(params.name)),
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
			context.queryClient.ensureQueryData(rateLimitsListQueryOptions),
		]),
	component: EditPoolPage,
});

function EditPoolFormInner() {
	const { name } = Route.useParams();
	const navigate = useNavigate();
	const { data: pool } = usePool(name);
	const { data: secretsData } = useSecrets();
	const { data: providersData } = useProviders();
	const { data: rateLimitsData } = useRateLimits();
	const updatePool = useUpdatePool(name);

	const poolSecrets = pool.spec.secrets ?? [];

	const [provider, setProvider] = useState(pool.spec.provider);
	const [selectedSecrets, setSelectedSecrets] = useState<string[]>(poolSecrets);
	const [secretSearch, setSecretSearch] = useState("");
	const [rateLimits, setRateLimits] = useState<RateLimitAttachment[]>(
		pool.spec.rateLimits ?? [],
	);
	const [serverError, setServerError] = useState<ApiErrorBody | undefined>();
	const [submitted, setSubmitted] = useState(false);

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
		if (!provider) return;

		setServerError(undefined);
		const payload: PoolUpdate = {
			metadata: pool.metadata,
			spec: {
				provider,
				secrets: selectedSecrets.length > 0 ? selectedSecrets : null,
				rateLimits: rateLimits.length > 0 ? rateLimits : undefined,
			},
		};
		try {
			await updatePool.mutateAsync(payload);
			toast("success", `Pool "${name}" updated.`);
			void navigate({ to: "/pools/$name", params: { name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to update pool.");
			}
		}
	}

	const allSecrets = secretsData.items ?? [];
	const filteredSecrets = allSecrets.filter((s) =>
		s.name.toLowerCase().includes(secretSearch.toLowerCase()),
	);

	return (
		<div>
			<h1 className="text-2xl font-bold text-foreground mb-6">
				Edit Pool: {name}
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
						htmlFor="provider"
						className="block text-sm font-medium text-foreground mb-1"
					>
						Provider <span className="text-red-500">*</span>
					</label>
					<select
						id="provider"
						value={provider}
						onChange={(e) => setProvider(e.target.value)}
						className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-brand-400"
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
							className="mt-1 text-xs text-destructive"
						>
							{providerError}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="secret-search"
						className="block text-sm font-medium text-foreground mb-1"
					>
						Secrets
					</label>
					<input
						id="secret-search"
						type="search"
						placeholder="Search secrets…"
						value={secretSearch}
						onChange={(e) => setSecretSearch(e.target.value)}
						className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2"
					/>
					{filteredSecrets.length === 0 ? (
						<p className="text-sm text-muted-foreground">
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
												? "bg-brand-600 text-white border-brand-600"
												: "bg-card text-foreground border-input hover:bg-neutral-50 dark:hover:bg-neutral-800",
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
						disabled={updatePool.isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
					>
						{updatePool.isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						onClick={() =>
							void navigate({ to: "/pools/$name", params: { name } })
						}
						disabled={updatePool.isPending}
						className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-input rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

function EditPoolPage() {
	return (
		<Suspense
			fallback={
				<div className="text-muted-foreground text-sm">Loading…</div>
			}
		>
			<EditPoolFormInner />
		</Suspense>
	);
}
