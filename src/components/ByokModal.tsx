import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useModels } from "@/api/hooks/models";
import { useProviders } from "@/api/hooks/providers";
import { Modal } from "@/components/Modal";

interface ByokModalProps {
	open: boolean;
	onClose: () => void;
	/** Custom handler. If omitted, navigates to /providers/$name?tab=keys&add=1. */
	onPick?: (providerName: string) => void;
}

export function ByokModal({ open, onClose, onPick }: ByokModalProps) {
	const { data: providers } = useProviders();
	const { data: models } = useModels();
	const [q, setQ] = useState("");
	const navigate = useNavigate();

	const items = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const m of models.items ?? []) {
			counts[m.spec.provider] = (counts[m.spec.provider] ?? 0) + 1;
		}
		const list = (providers.items ?? []).map((p) => ({
			name: p.metadata.name,
			displayName: p.metadata.displayName ?? p.metadata.name,
			isDefault: !!p.spec.default,
			modelCount: counts[p.metadata.name] ?? 0,
		}));
		const ql = q.trim().toLowerCase();
		const filtered = ql
			? list.filter(
					(x) =>
						x.name.toLowerCase().includes(ql) ||
						x.displayName.toLowerCase().includes(ql),
				)
			: list;
		return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
	}, [providers, models, q]);

	function pick(providerName: string) {
		onClose();
		if (onPick) {
			onPick(providerName);
			return;
		}
		void navigate({
			to: "/providers/$name",
			params: { name: providerName },
			search: { tab: "keys", add: "1" },
		});
	}

	return (
		<Modal open={open} onClose={onClose} title="Connect a provider key">
			<p className="text-xs text-muted-foreground mb-3">
				Pick a provider — you'll add the API key on the next screen.
			</p>
			<div className="relative mb-3">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
				<input
					type="search"
					value={q}
					onChange={(e) => setQ(e.currentTarget.value)}
					placeholder="Search providers"
					className="w-full h-8 pl-8 pr-3 rounded-md text-xs text-foreground bg-card border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus-visible:ring-ring focus:border-transparent"
				/>
			</div>
			<ul className="max-h-72 overflow-y-auto -mx-1 px-1 flex flex-col gap-1">
				{items.length === 0 ? (
					<li className="px-3 py-6 text-center text-xs text-muted-foreground">
						No providers match.
					</li>
				) : (
					items.map((p) => (
						<li key={p.name}>
							<button
								type="button"
								onClick={() => pick(p.name)}
								className="w-full flex items-center justify-between gap-3 px-3 h-10 rounded-md hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
							>
								<div className="flex items-center gap-2 min-w-0">
									<span className="text-sm font-medium text-foreground truncate capitalize">
										{p.displayName}
									</span>
									{p.isDefault && (
										<span className="text-[10px] uppercase tracking-wide text-muted-foreground">
											default
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
									<span>
										{p.modelCount} {p.modelCount === 1 ? "model" : "models"}
									</span>
									<ChevronRight className="w-3.5 h-3.5" />
								</div>
							</button>
						</li>
					))
				)}
			</ul>
		</Modal>
	);
}
