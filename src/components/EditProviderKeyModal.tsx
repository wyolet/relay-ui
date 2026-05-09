import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/api/client";
import { useModels } from "@/api/hooks/models";
import { usePools } from "@/api/hooks/pools";
import { useDeleteSecret } from "@/api/hooks/secrets";
import { ApiError } from "@/api/types/errors";
import { confirm } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { MultiSelect } from "@/components/MultiSelect";
import { toast } from "@/components/Toast";
import { useKeysStore } from "@/stores/keys";

interface EditProviderKeyModalProps {
	open: boolean;
	onClose: () => void;
	secretName: string;
	providerName: string;
}

export function EditProviderKeyModal({
	open,
	onClose,
	secretName,
	providerName,
}: EditProviderKeyModalProps) {
	const { data: poolsData } = usePools();
	const { data: modelsData } = useModels();
	const relayKeyItems = useKeysStore((s) => s.items);
	const relayKeys = useMemo(
		() => relayKeyItems.filter((k) => k.revokedAt === null),
		[relayKeyItems],
	);
	const deleteSecret = useDeleteSecret();
	const queryClient = useQueryClient();

	const providerPools = useMemo(
		() =>
			(poolsData.items ?? []).filter((p) => p.spec.provider === providerName),
		[poolsData.items, providerName],
	);
	const providerModels = useMemo(
		() =>
			(modelsData.items ?? []).filter((m) => m.spec.provider === providerName),
		[modelsData.items, providerName],
	);

	const [name, setName] = useState(secretName);
	const [selectedPools, setSelectedPools] = useState<string[]>([]);
	const [selectedModels, setSelectedModels] = useState<string[]>([]);
	const [selectedRelayKeys, setSelectedRelayKeys] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	const initRef = useRef<{ open: boolean; secret: string }>({
		open: false,
		secret: "",
	});
	useEffect(() => {
		const last = initRef.current;
		if (open && (!last.open || last.secret !== secretName)) {
			const inPools = providerPools
				.filter((p) => (p.spec.secrets ?? []).includes(secretName))
				.map((p) => p.metadata.name);
			setName(secretName);
			setSelectedPools(inPools);
			setSelectedModels([]);
			setSelectedRelayKeys([]);
		}
		initRef.current = { open, secret: secretName };
	}, [open, secretName, providerPools]);

	async function handleSave() {
		setSaving(true);
		try {
			if (name.trim() !== secretName) {
				toast(
					"error",
					"Rename requires backend support — keep the name unchanged for now.",
				);
				setSaving(false);
				return;
			}
			const targetPoolNames = selectedPools;
			const updates = providerPools.flatMap((pool) => {
				const has = (pool.spec.secrets ?? []).includes(secretName);
				const should = targetPoolNames.includes(pool.metadata.name);
				if (has === should) return [];
				const nextSecrets = should
					? [...(pool.spec.secrets ?? []), secretName]
					: (pool.spec.secrets ?? []).filter((s) => s !== secretName);
				return [
					{
						name: pool.metadata.name,
						body: { ...pool, spec: { ...pool.spec, secrets: nextSecrets } },
					},
				];
			});
			for (const u of updates) {
				const { error } = await apiClient.PUT("/control/pools/{name}", {
					params: { path: { name: u.name } },
					body: u.body,
				});
				if (error) throw new ApiError(0, error.error);
			}
			void queryClient.invalidateQueries({ queryKey: ["pools"] });
			toast("success", `"${secretName}" updated.`);
			onClose();
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to save changes.",
			);
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		const ok = await confirm({
			title: `Delete key ${secretName}?`,
			description: "This cannot be undone.",
			confirmLabel: "Delete",
			danger: true,
		});
		if (!ok) return;
		try {
			await deleteSecret.mutateAsync(secretName);
			toast("success", `"${secretName}" deleted.`);
			onClose();
		} catch (err) {
			toast(
				"error",
				err instanceof ApiError ? err.body.message : "Failed to delete key.",
			);
		}
	}

	return (
		<Modal open={open} onClose={onClose} title={`Edit ${secretName}`} size="lg">
			<div className="flex flex-col gap-5">
				<Field label="Name">
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.currentTarget.value)}
						placeholder={secretName}
						className="w-full h-8 rounded-md px-2.5 text-sm text-foreground bg-card border border-input placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent"
					/>
				</Field>

				<PickerField
					label="Pools"
					description="Pools this key belongs to. Relay tries keys in pool order; leave empty to detach the key from every pool."
					options={providerPools.map((p) => ({
						value: p.metadata.name,
						label: p.metadata.name,
					}))}
					selected={selectedPools}
					onChange={setSelectedPools}
					placeholder="Select pools…"
					emptyHint="No pools for this provider."
				/>

				<PickerField
					label="Models"
					description="Restrict this key to specific models. Leave empty to allow every model the provider exposes."
					options={providerModels.map((m) => ({
						value: m.metadata.name,
						label: m.spec.displayName ?? m.metadata.name,
					}))}
					selected={selectedModels}
					onChange={setSelectedModels}
					placeholder="Select models…"
					emptyHint="No models registered for this provider."
				/>

				<PickerField
					label="Relay keys"
					description="Limit which Relay API keys can use this provider key. Leave empty to allow all of them."
					options={relayKeys.map((k) => ({ value: k.id, label: k.name }))}
					selected={selectedRelayKeys}
					onChange={setSelectedRelayKeys}
					placeholder="Select relay keys…"
					emptyHint="No active Relay keys."
				/>

				<div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
					<button
						type="button"
						onClick={() => void handleDelete()}
						className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
					>
						<Trash2 className="w-3.5 h-3.5" />
						Delete key
					</button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3 rounded-md text-xs font-medium text-foreground hover:bg-muted"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => void handleSave()}
							disabled={saving}
							className="h-8 px-3 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-xs font-semibold text-white disabled:opacity-50"
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
				{label}
			</div>
			{children}
		</div>
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
		<div>
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
				{label}
			</div>
			<MultiSelect
				options={options}
				selected={selected}
				onChange={onChange}
				placeholder={placeholder}
				emptyHint={emptyHint}
				aria-label={label}
			/>
			<p className="mt-1 text-[11px] text-muted-foreground">
				{description}
			</p>
		</div>
	);
}
