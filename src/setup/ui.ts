/**
 * Wizard-scoped button styling. We deliberately diverge from the default
 * shadcn button here (richer gradient + tinted shadow + lift) so the setup flow
 * feels like a polished standalone moment rather than another admin form.
 */
export const wizardPrimary =
	"h-10 rounded-xl bg-gradient-to-b from-primary to-primary/85 px-5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/35 hover:brightness-105 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none";

export const wizardGhost =
	"h-10 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
