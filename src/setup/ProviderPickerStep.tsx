import { motion } from "motion/react";
import { ProviderBadge } from "./ProviderBadge";
import type { ProviderId } from "./providerCatalog";
import type { ProviderCard } from "./useSetupWizard";

interface ProviderPickerStepProps {
	providers: ProviderCard[];
	reuse: boolean;
	onSelect: (id: ProviderId) => void;
}

export function ProviderPickerStep({
	providers,
	reuse,
	onSelect,
}: ProviderPickerStepProps) {
	return (
		<div className="flex flex-col gap-6">
			<header className="text-center">
				<h2 className="text-2xl font-bold text-foreground">
					{reuse ? "Connect another provider" : "Pick a provider to connect"}
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Choose where Relay should route your requests. You can add more later.
				</p>
			</header>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{providers.map((p, i) => (
					<motion.button
						key={p.def.id}
						type="button"
						disabled={!p.available}
						onClick={() => onSelect(p.def.id)}
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05, duration: 0.25 }}
						whileHover={p.available ? { y: -2 } : undefined}
						whileTap={p.available ? { scale: 0.98 } : undefined}
						className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-background"
					>
						<ProviderBadge def={p.def} host={p.host} size={44} />
						<span className="min-w-0 flex-1">
							<span className="flex items-center justify-between gap-2">
								<span className="font-medium text-foreground">
									{p.def.label}
								</span>
								{p.available ? (
									p.modelCount > 0 && (
										<span className="shrink-0 text-[11px] text-muted-foreground">
											{p.modelCount} models
										</span>
									)
								) : (
									<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
										not seeded
									</span>
								)}
							</span>
							<span className="mt-0.5 block truncate text-xs text-muted-foreground">
								{p.def.blurb}
							</span>
						</span>
					</motion.button>
				))}
			</div>
		</div>
	);
}
