import { ChevronLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { ModelPicker } from "@/models/ModelPicker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export interface RLMeta {
	id: string;
	label: string;
	rules: string;
}

export interface AttachRateLimitModalProps {
	existing: { rateLimitId: string; models: string[] } | undefined;
	rateLimits: RLMeta[];
	excludeRLIds: Set<string>;
	allowedModels: string[];
	includeDeprecated: boolean;
	onClose: () => void;
	onSave: (rateLimitId: string, models: string[]) => void;
}

export function AttachRateLimitModal({
	existing,
	rateLimits,
	excludeRLIds,
	allowedModels,
	includeDeprecated,
	onClose,
	onSave,
}: AttachRateLimitModalProps) {
	const isEdit = existing !== undefined;
	const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
	const [rateLimitId, setRateLimitId] = useState(existing?.rateLimitId ?? "");
	const [models, setModels] = useState<string[]>(existing?.models ?? []);

	const availableRLs = rateLimits.filter(
		(rl) => rl.id === rateLimitId || !excludeRLIds.has(rl.id),
	);

	return (
		<Dialog
			open
			onOpenChange={(open, details) => {
				// Block overlay click so the operator doesn't lose their picks.
				if (!open && details.reason === "outside-press") return;
				if (!open) onClose();
			}}
		>
			<DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? "Edit rate limit" : "Attach rate limit"}
					</DialogTitle>
					<DialogDescription>
						Step {step} of 2 —{" "}
						{step === 1
							? "pick the rate limit to attach"
							: "pick which models this rate limit governs"}
					</DialogDescription>
				</DialogHeader>

				{step === 1 ? (
					<Step1RateLimit
						value={rateLimitId}
						onChange={setRateLimitId}
						options={availableRLs}
					/>
				) : (
					<Step2Models
						value={models}
						onChange={setModels}
						allowedModels={allowedModels}
						includeDeprecated={includeDeprecated}
						rateLimitLabel={
							rateLimits.find((rl) => rl.id === rateLimitId)?.label ?? "—"
						}
					/>
				)}

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					{step === 1 ? (
						<Button
							type="button"
							onClick={() => setStep(2)}
							disabled={!rateLimitId}
						>
							Continue
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep(1)}
							>
								<ChevronLeft className="w-3.5 h-3.5" />
								Back
							</Button>
							<Button type="button" onClick={() => onSave(rateLimitId, models)}>
								{isEdit ? "Save changes" : "Attach"}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface Step1Props {
	value: string;
	onChange: (id: string) => void;
	options: RLMeta[];
}

function Step1RateLimit({ value, onChange, options }: Step1Props) {
	const [q, setQ] = useState("");
	const filtered = useMemo(
		() =>
			q
				? options.filter(
						(o) =>
							o.label.toLowerCase().includes(q.toLowerCase()) ||
							o.rules.toLowerCase().includes(q.toLowerCase()),
					)
				: options,
		[q, options],
	);

	if (options.length === 0) {
		return (
			<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
				No rate limits available — create one first.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<input
				type="text"
				value={q}
				onChange={(e) => setQ(e.currentTarget.value)}
				placeholder="Search rate limits…"
				className="h-8 px-2 rounded-md border border-input bg-input/30 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
			/>
			<ul className="max-h-80 overflow-auto rounded-md border border-border bg-muted/20 divide-y divide-border">
				{filtered.length === 0 && (
					<li className="px-3 py-3 text-center text-xs text-muted-foreground">
						No matches.
					</li>
				)}
				{filtered.map((opt) => {
					const selected = opt.id === value;
					return (
						<li key={opt.id}>
							<button
								type="button"
								onClick={() => onChange(opt.id)}
								className={`w-full flex items-start gap-2 px-2 py-2 text-left hover:bg-muted/50 ${
									selected ? "bg-primary/10" : ""
								}`}
							>
								<span
									className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
										selected
											? "border-primary bg-primary"
											: "border-input"
									}`}
								>
									{selected && (
										<span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
									)}
								</span>
								<span className="flex flex-col min-w-0">
									<span className="text-sm font-medium text-foreground truncate">
										{opt.label}
									</span>
									{opt.rules && (
										<span className="font-mono text-[10px] text-muted-foreground truncate">
											{opt.rules}
										</span>
									)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

interface Step2Props {
	value: string[];
	onChange: (models: string[]) => void;
	allowedModels: string[];
	includeDeprecated: boolean;
	rateLimitLabel: string;
}

function Step2Models({
	value,
	onChange,
	allowedModels,
	includeDeprecated,
	rateLimitLabel,
}: Step2Props) {
	if (allowedModels.length === 0) {
		return (
			<div className="flex flex-col gap-2">
				<div className="text-[11px] text-muted-foreground">
					Attaching{" "}
					<span className="font-medium text-foreground">{rateLimitLabel}</span>
				</div>
				<div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground text-center">
					The Allowed catalog is empty. Save with no models to make this rate
					limit apply to every request, or add models to the Allowed catalog
					first to scope it.
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[11px] text-muted-foreground">
				Attaching{" "}
				<span className="font-medium text-foreground">{rateLimitLabel}</span>
				{" — "}
				pick providers, models, or hosts from the policy's Allowed catalog.
			</div>
			<ModelPicker
				value={value}
				onChange={onChange}
				includeDeprecated={includeDeprecated}
				restrictTo={allowedModels}
			/>
			<p className="text-[10px] text-muted-foreground">
				No selection = this rate limit applies to every request to the policy.
			</p>
		</div>
	);
}
