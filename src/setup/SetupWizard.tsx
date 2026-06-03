import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { CredentialsStep } from "./CredentialsStep";
import { LimitsStep } from "./LimitsStep";
import { ProviderPickerStep } from "./ProviderPickerStep";
import { SuccessStep } from "./SuccessStep";
import { type SetupStep, useSetupWizard } from "./useSetupWizard";

const STEP_ORDER: SetupStep[] = ["provider", "credentials", "limits", "done"];

function StepDots({ step }: { step: SetupStep }) {
	const active = STEP_ORDER.indexOf(step);
	return (
		<div className="flex items-center justify-center gap-2">
			{STEP_ORDER.map((s, i) => (
				<span
					key={s}
					className={`h-1.5 rounded-full transition-all ${
						i <= active ? "w-6 bg-primary" : "w-3 bg-border"
					}`}
				/>
			))}
		</div>
	);
}

export function SetupWizard() {
	const wiz = useSetupWizard();

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
			{/* ambient brand glows behind the card */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-0 size-[42rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-500/10 blur-[120px]" />
				<div className="absolute bottom-0 right-0 size-[32rem] translate-x-1/4 translate-y-1/4 rounded-full bg-accent-500/10 blur-[120px]" />
			</div>
			<div className="relative w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl shadow-black/10 ring-1 ring-black/5 backdrop-blur-sm dark:shadow-black/40 dark:ring-white/5">
				<div className="mb-6 flex items-center justify-between">
					<span className="text-sm font-semibold text-foreground">
						Relay setup
					</span>
					<Button type="button" variant="ghost" size="sm" onClick={wiz.leave}>
						{wiz.hasIssuedKey ? "Done" : "Skip for now"}
					</Button>
				</div>

				<StepDots step={wiz.step} />

				<div className="mt-8">
					<AnimatePresence mode="wait">
						<motion.div
							key={wiz.step}
							initial={{ opacity: 0, x: 24 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -24 }}
							transition={{ duration: 0.22 }}
						>
							{wiz.step === "provider" && (
								<ProviderPickerStep
									providers={wiz.providers}
									reuse={wiz.hasIssuedKey}
									onSelect={wiz.selectProvider}
								/>
							)}

							{wiz.step === "credentials" &&
								wiz.selectedProvider &&
								wiz.selectedHost && (
									<CredentialsStep
										provider={wiz.selectedProvider}
										host={wiz.selectedHost}
										modelCount={wiz.selectedModelCount}
										busy={wiz.busy}
										error={wiz.error}
										onBack={wiz.backToProviders}
										onSubmit={wiz.submitCredentials}
									/>
								)}

							{wiz.step === "limits" && wiz.selectedProvider && (
								<LimitsStep
									providerLabel={wiz.selectedProvider.label}
									busy={wiz.busy}
									error={wiz.error}
									onSubmit={wiz.finish}
								/>
							)}

							{wiz.step === "done" && wiz.relayKey && (
								<SuccessStep
									relayKey={wiz.relayKey}
									sampleModel={wiz.sampleModel}
									onAddAnother={wiz.addAnotherProvider}
									onFinish={wiz.leave}
								/>
							)}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
