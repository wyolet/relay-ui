import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useCreatePool } from "#/api/hooks/pools";
import { providersListQueryOptions, useProviders } from "#/api/hooks/providers";
import { secretsListQueryOptions, useSecrets } from "#/api/hooks/secrets";
import type { ApiErrorBody } from "#/api/types/errors";
import { ApiError } from "#/api/types/errors";
import type { PoolCreate } from "#/api/types/pool";
import { toast } from "#/components/Toast";

export const Route = createFileRoute("/_authenticated/pools/new")({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(secretsListQueryOptions),
			context.queryClient.ensureQueryData(providersListQueryOptions),
		]),
	component: NewPoolPage,
});

function NewPoolFormInner() {
	const navigate = useNavigate();
	const createPool = useCreatePool();
	const { data: secretsData } = useSecrets();
	const { data: providersData } = useProviders();

	const [name, setName] = useState("");
	const [provider, setProvider] = useState("");
	const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
	const [isDefault, setIsDefault] = useState(false);
	const [secretSearch, setSecretSearch] = useState("");
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
			name: name.trim(),
			provider,
			secrets: selectedSecrets,
			default: isDefault || undefined,
		};
		try {
			await createPool.mutateAsync(payload);
			toast("success", `Pool "${payload.name}" created.`);
			void navigate({ to: "/pools/$name", params: { name: payload.name } });
		} catch (err) {
			if (err instanceof ApiError) {
				setServerError(err.body);
			} else {
				toast("error", "Failed to create pool.");
			}
		}
	}

	const allSecrets = secretsData.items;
	const filteredSecrets = allSecrets.filter((s) =>
		s.name.toLowerCase().includes(secretSearch.toLowerCase()),
	);

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 mb-6">New Pool</h1>

			{serverError && (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Name <span className="text-red-500">*</span>
					</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="my-pool"
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
					{nameError && (
						<p role="alert" className="mt-1 text-xs text-red-600">
							{nameError}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="provider"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Provider <span className="text-red-500">*</span>
					</label>
					<select
						id="provider"
						value={provider}
						onChange={(e) => setProvider(e.target.value)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
					>
						<option value="">— select —</option>
						{providersData.items.map((p) => (
							<option key={p.name} value={p.name}>
								{p.name}
							</option>
						))}
					</select>
					{providerError && (
						<p role="alert" className="mt-1 text-xs text-red-600">
							{providerError}
						</p>
					)}
				</div>

				<div>
					<label
						htmlFor="secret-search"
						className="block text-sm font-medium text-gray-700 mb-1"
					>
						Secrets
					</label>
					<input
						id="secret-search"
						type="search"
						placeholder="Search secrets…"
						value={secretSearch}
						onChange={(e) => setSecretSearch(e.target.value)}
						className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
					/>
					{filteredSecrets.length === 0 ? (
						<p className="text-sm text-gray-500">No secrets found.</p>
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
												: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
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

				<div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={isDefault}
							onChange={(e) => setIsDefault(e.target.checked)}
							className="rounded border-gray-300"
						/>
						<span className="text-sm font-medium text-gray-700">
							Set as default pool
						</span>
					</label>
				</div>

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
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
		<Suspense fallback={<div className="text-gray-500 text-sm">Loading…</div>}>
			<NewPoolFormInner />
		</Suspense>
	);
}
