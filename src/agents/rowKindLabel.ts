const ROW_KIND_LABELS: Record<string, string> = {
	"service-account": "Service account",
	account: "Account",
	share: "Share",
	pool: "Pool",
	policy: "Policy",
	"policy-binding": "Policy binding",
	key: "Key",
};

/** A readable label for an API row kind; a kind not listed reads as relay sent it. */
export function rowKindLabel(kind: string): string {
	return ROW_KIND_LABELS[kind] ?? kind;
}
