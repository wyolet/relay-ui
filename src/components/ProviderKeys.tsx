import { useForm } from "@tanstack/react-form";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	Eye,
	EyeOff,
	KeyRound,
	Plus,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useModels } from "@/api/hooks/models";
import { usePools, useUpdatePool } from "@/api/hooks/pools";
import { useCreateSecret, useDeleteSecret, useSecrets } from "@/api/hooks/secrets";
import { ApiError } from "@/api/types/errors";
import type { Pool } from "@/api/types/pool";
import type { SecretResponse } from "@/api/types/secret";
import { MultiSelect } from "@/components/MultiSelect";
import { toast } from "@/components/Toast";
import { useKeysStore } from "@/stores/keys";

interface ProviderKeysProps {
	providerName: string;
	autoOpenAdd?: boolean;
	keyQuery?: string;
}

export function ProviderKeys({
	providerName,
	autoOpenAdd,
	keyQuery,
}: ProviderKeysProps) {
	const { data: poolsData } = usePools();
	const { data: secretsData } = useSecrets();
	const pools = (poolsData.items ?? []).filter(
		(p) => p.spec.provider === providerName,
	);
	const secretsByName: Record<string, SecretResponse> = {};
	for (const s of secretsData.items ?? []) secretsByName[s.name] = s;

	if (pools.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-input bg-card px-6 py-14 text-center">
				<KeyRound className="w-6 h-6 mx-auto mb-3 text-muted-foreground/50" />
				<p className="text-sm text-muted-foreground">
					No pools defined for this provider yet.
				</p>
				<p className="text-xs text-muted-foreground mt-1">
					Keys live inside pools — create one to start.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="text-xs text-muted-foreground">
				A pool groups keys that Relay treats as interchangeable. Order = priority;
				the first reachable key is tried first.
			</p>
			{pools.map((pool, idx) => (
				<PoolCard
					key={pool.metadata.name}
					pool={pool}
					secretsByName={secretsByName}
					providerName={providerName}
					autoOpenAdd={autoOpenAdd && idx === 0}
					keyQuery={keyQuery}
				/>
			))}
		</div>
	);
}

interface PoolCardProps {
	pool: Pool;
	secretsByName: Record<string, SecretResponse>;
	providerName: string;
	autoOpenAdd?: boolean;
	keyQuery?: string;
}

function PoolCard({
	pool,
	secretsByName,
	providerName,
	autoOpenAdd,
	keyQuery,
}: PoolCardProps) {
	const updatePool = useUpdatePool(pool.metadata.name);
	const deleteSecret = useDeleteSecret();
	const [adding, setAdding] = useState(false);
	const secrets = pool.spec.secrets ?? [];
	const ql = keyQuery?.trim().toLowerCase() ?? "";
	const filteredIdx = secrets
		.map((name, idx) => ({ name, idx }))
		.filter(({ name }) => !ql || name.toLowerCase().includes(ql));

	useEffect(() => {
		if (autoOpenAdd) setAdding(true);
	}, [autoOpenAdd]);

	async function reorder(idx: number, direction: -1 | 1) {
		const target = idx + direction;
		if (target < 0 || target >= secrets.length) return;
		const next = [...secrets];
		[next[idx], next[target]] = [next[target], next[idx]];
		try {
			await updatePool.mutateAsync({
				...pool,
				spec: { ...pool.spec, secrets: next },
			});
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to reorder keys.",
			);
		}
	}

	async function unlink(name: string, alsoDelete: boolean) {
		if (
			!window.confirm(
				alsoDelete
					? `Delete key "${name}" entirely? This cannot be undone.`
					: `Remove "${name}" from this pool?`,
			)
		)
			return;
		try {
			await updatePool.mutateAsync({
				...pool,
				spec: { ...pool.spec, secrets: secrets.filter((s) => s !== name) },
			});
			if (alsoDelete) {
				await deleteSecret.mutateAsync(name);
			}
			toast("success", alsoDelete ? "Key deleted." : "Key removed from pool.");
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to remove key.",
			);
		}
	}

	return (
		<section className="rounded-lg border border-border bg-card">
			<header className="flex items-center justify-between px-4 h-10 border-b border-border">
				<div className="flex items-center gap-2 min-w-0">
					<h3 className="text-sm font-semibold text-foreground truncate">
						{pool.metadata.name}
					</h3>
					{pool.spec.passthrough && (
						<span className="text-[10px] uppercase tracking-wide text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
							passthrough
						</span>
					)}
					<span className="text-[11px] text-muted-foreground">
						{secrets.length} {secrets.length === 1 ? "key" : "keys"}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setAdding((v) => !v)}
					className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Plus className="w-3.5 h-3.5" />
					Add key
				</button>
			</header>

			<ul className="divide-y divide-border">
				{secrets.length === 0 && !adding && (
					<li className="px-4 py-6 text-center text-xs text-muted-foreground">
						No keys in this pool yet.
					</li>
				)}
				{secrets.length > 0 && filteredIdx.length === 0 && (
					<li className="px-4 py-6 text-center text-xs text-muted-foreground">
						No keys match the search.
					</li>
				)}
				{filteredIdx.map(({ name, idx }) => (
					<KeyRow
						key={name}
						priority={idx + 1}
						name={name}
						secret={secretsByName[name]}
						canMoveUp={idx > 0}
						canMoveDown={idx < secrets.length - 1}
						onMoveUp={() => reorder(idx, -1)}
						onMoveDown={() => reorder(idx, 1)}
						onUnlink={() => unlink(name, false)}
						onDelete={() => unlink(name, true)}
					/>
				))}
				{adding && (
					<li className="px-4 py-3">
						<AddKeyForm
							pool={pool}
							providerName={providerName}
							existingNames={new Set(Object.keys(secretsByName))}
							onCancel={() => setAdding(false)}
							onSaved={() => setAdding(false)}
						/>
					</li>
				)}
			</ul>
		</section>
	);
}

interface KeyRowProps {
	priority: number;
	name: string;
	secret: SecretResponse | undefined;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onUnlink: () => void;
	onDelete: () => void;
}

function KeyRow({
	priority,
	name,
	secret,
	canMoveUp,
	canMoveDown,
	onMoveUp,
	onMoveDown,
	onUnlink,
	onDelete,
}: KeyRowProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const kind = secret?.valueFrom.kind;
	const masked = secret?.valueFrom.value_masked;
	const env = secret?.valueFrom.env;
	return (
		<li className="px-4 py-2.5 flex items-center gap-3">
			<div className="flex flex-col">
				<button
					type="button"
					onClick={onMoveUp}
					disabled={!canMoveUp}
					aria-label="Move up"
					className="h-4 w-4 inline-flex items-center justify-center text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:hover:text-neutral-400"
				>
					<ArrowUp className="w-3 h-3" />
				</button>
				<button
					type="button"
					onClick={onMoveDown}
					disabled={!canMoveDown}
					aria-label="Move down"
					className="h-4 w-4 inline-flex items-center justify-center text-neutral-400 hover:text-foreground disabled:opacity-30 disabled:hover:text-neutral-400"
				>
					<ArrowDown className="w-3 h-3" />
				</button>
			</div>
			<span className="inline-flex items-center justify-center h-6 w-6 rounded text-[11px] font-semibold tabular-nums bg-muted text-muted-foreground">
				{priority}
			</span>
			<span className="text-sm font-medium text-foreground truncate">
				{name}
			</span>
			{kind === "stored" && masked && (
				<code className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
					{masked}
				</code>
			)}
			{kind === "env" && env && (
				<code className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
					${env}
				</code>
			)}
			<span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
				{kind ?? "missing"}
			</span>
			<div className="relative">
				<button
					type="button"
					onClick={() => setMenuOpen((v) => !v)}
					onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
					aria-label="Key actions"
					className="h-7 w-7 inline-flex items-center justify-center rounded-md text-neutral-500 hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ChevronDown className="w-3.5 h-3.5" />
				</button>
				{menuOpen && (
					<div className="absolute right-0 top-8 z-10 min-w-[180px] rounded-md border border-border bg-card shadow-lg py-1">
						<MenuItem onClick={onUnlink}>Remove from pool</MenuItem>
						<MenuItem onClick={onDelete} danger>
							<Trash2 className="w-3.5 h-3.5" />
							Delete key entirely
						</MenuItem>
					</div>
				)}
			</div>
		</li>
	);
}

function MenuItem({
	onClick,
	danger,
	children,
}: {
	onClick: () => void;
	danger?: boolean;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onMouseDown={(e) => e.preventDefault()}
			onClick={onClick}
			className={[
				"w-full text-left px-3 py-1.5 text-xs inline-flex items-center gap-2 transition-colors",
				danger
					? "text-destructive hover:bg-destructive/10"
					: "text-foreground hover:bg-muted",
			].join(" ")}
		>
			{children}
		</button>
	);
}

const addKeySchema = z.object({
	name: z
		.string()
		.min(1, "Required")
		.regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, digits, _ . -"),
	value: z.string().min(1, "API key required"),
});

function firstError(errors: ReadonlyArray<unknown>): string | undefined {
	for (const e of errors) {
		if (typeof e === "string") return e;
		if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
			return e.message;
		}
	}
	return undefined;
}

interface AddKeyFormProps {
	pool: Pool;
	providerName: string;
	existingNames: Set<string>;
	onCancel: () => void;
	onSaved: () => void;
}

function AddKeyForm({
	pool,
	providerName,
	existingNames,
	onCancel,
	onSaved,
}: AddKeyFormProps) {
	const createSecret = useCreateSecret();
	const updatePool = useUpdatePool(pool.metadata.name);
	const { data: modelsData } = useModels();
	const { data: poolsData } = usePools();
	const apiKeys = useKeysStore((s) => s.items);
	const [showValue, setShowValue] = useState(false);

	const providerModels = (modelsData.items ?? []).filter(
		(m) => m.spec.provider === providerName,
	);
	const providerPools = (poolsData.items ?? []).filter(
		(p) => p.spec.provider === providerName,
	);
	const activeApiKeys = apiKeys.filter((k) => k.revokedAt === null);

	// Filters (UI only — captured for future backend support)
	const [modelsSelected, setModelsSelected] = useState<string[]>([]);
	const [keysSelected, setKeysSelected] = useState<string[]>([]);
	const [poolsSelected, setPoolsSelected] = useState<string[]>([pool.metadata.name]);

	const form = useForm({
		defaultValues: { name: "", value: "" },
		validators: { onSubmit: addKeySchema },
		onSubmit: async ({ value }) => {
			if (existingNames.has(value.name)) {
				toast("error", `A secret named "${value.name}" already exists.`);
				return;
			}
			try {
				await createSecret.mutateAsync({
					name: value.name,
					provider: providerName,
					valueFrom: { kind: "stored", value: value.value },
				});
				const targetPools =
					poolsSelected.length > 0
						? providerPools.filter((p) => poolsSelected.includes(p.metadata.name))
						: [pool];
				await Promise.all(
					targetPools.map((p) =>
						updatePool.mutateAsync({
							...p,
							spec: { ...p.spec, secrets: [...(p.spec.secrets ?? []), value.name] },
						}),
					),
				);
				toast("success", `Key "${value.name}" added.`);
				onSaved();
			} catch (err) {
				toast(
					"error",
					err instanceof ApiError ? err.body.message : "Failed to add key.",
				);
			}
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col gap-3"
		>
			<form.Field name="name">
				{(field) => {
					const err = firstError(field.state.meta.errors);
					return (
						<div>
							<label
								htmlFor={`pool-${pool.metadata.name}-name`}
								className="block text-[11px] font-medium text-muted-foreground mb-1"
							>
								Name <span className="text-neutral-400">(optional label)</span>
							</label>
							<input
								id={`pool-${pool.metadata.name}-name`}
								type="text"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.currentTarget.value)}
								onBlur={field.handleBlur}
								placeholder={`${providerName}-prod`}
								aria-invalid={err ? true : undefined}
								className="w-full h-8 rounded-md px-2.5 text-sm text-foreground bg-card border border-input placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent"
							/>
							{err && (
								<p className="text-[11px] text-destructive mt-1">
									{err}
								</p>
							)}
						</div>
					);
				}}
			</form.Field>

			<form.Field name="value">
				{(field) => {
					const err = firstError(field.state.meta.errors);
					return (
						<div>
							<label
								htmlFor={`pool-${pool.metadata.name}-value`}
								className="block text-[11px] font-medium text-muted-foreground mb-1"
							>
								API key
							</label>
							<div className="relative">
								<input
									id={`pool-${pool.metadata.name}-value`}
									type={showValue ? "text" : "password"}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.currentTarget.value)}
									onBlur={field.handleBlur}
									placeholder="sk-…"
									aria-invalid={err ? true : undefined}
									className="w-full h-8 rounded-md pl-2.5 pr-9 text-sm font-mono text-foreground bg-card border border-input placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent"
								/>
								<button
									type="button"
									onClick={() => setShowValue((v) => !v)}
									aria-label={showValue ? "Hide value" : "Show value"}
									className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded text-neutral-500 hover:text-foreground hover:bg-muted"
								>
									{showValue ? (
										<EyeOff className="w-3.5 h-3.5" />
									) : (
										<Eye className="w-3.5 h-3.5" />
									)}
								</button>
							</div>
							{err && (
								<p className="text-[11px] text-destructive mt-1">
									{err}
								</p>
							)}
						</div>
					);
				}}
			</form.Field>

			<div className="mt-1 pt-3 border-t border-border flex flex-col gap-2">
				<h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
					Filters
				</h4>
				<PickerField
					label="Models"
					description="Restrict this key to specific models. Leave empty to allow every model the provider exposes."
					options={providerModels.map((m) => ({
						value: m.metadata.name,
						label: m.spec.displayName ?? m.metadata.name,
					}))}
					selected={modelsSelected}
					onChange={setModelsSelected}
					placeholder="Select models…"
					emptyHint="No models registered for this provider yet."
				/>
				<PickerField
					label="Relay keys"
					description="Limit which Relay API keys can use this provider key. Leave empty to allow all of them."
					options={activeApiKeys.map((k) => ({ value: k.id, label: k.name }))}
					selected={keysSelected}
					onChange={setKeysSelected}
					placeholder="Select relay keys…"
					emptyHint="No active Relay keys yet."
				/>
				<PickerField
					label="Pools"
					description="Pools this key joins on save. Defaults to the current pool; pick more to add the key to several at once."
					options={providerPools.map((p) => ({
						value: p.metadata.name,
						label: p.metadata.name,
					}))}
					selected={poolsSelected}
					onChange={setPoolsSelected}
					placeholder="Select pools…"
					emptyHint="No other pools."
				/>
			</div>

			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors"
				>
					Cancel
				</button>
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<button
							type="submit"
							disabled={isSubmitting}
							className="h-8 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Save
						</button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}

interface PickerFieldProps {
	label: string;
	description: string;
	options: { value: string; label: string }[];
	selected: string[];
	onChange: (next: string[]) => void;
	placeholder?: string;
	emptyHint?: string;
}

function PickerField({
	label,
	description,
	options,
	selected,
	onChange,
	placeholder,
	emptyHint,
}: PickerFieldProps) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs font-medium text-foreground">
				{label}
			</span>
			<MultiSelect
				options={options}
				selected={selected}
				onChange={onChange}
				placeholder={placeholder}
				emptyHint={emptyHint}
				aria-label={label}
			/>
			<p className="text-[11px] text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
