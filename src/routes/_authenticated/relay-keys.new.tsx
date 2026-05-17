import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, Copy } from "lucide-react";
import { Suspense, useState } from "react";
import { policiesListQueryOptions } from "@/api/hooks/policies";
import { RelayKeyForm } from "@/relay-keys/RelayKeyForm";
import { toast } from "@/shared/Toast";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/relay-keys/new")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(policiesListQueryOptions),
	component: NewRelayKeyPage,
});

function NewRelayKeyInner() {
	const navigate = useNavigate();
	const [plaintext, setPlaintext] = useState<string | null>(null);
	const [savedName, setSavedName] = useState<string | null>(null);

	if (plaintext !== null && savedName !== null) {
		return (
			<div className="flex flex-col gap-4 max-w-2xl">
				<div>
					<h1 className="text-xl font-semibold text-foreground">
						Relay key created
					</h1>
					<p className="mt-1 text-xs text-muted-foreground">
						Copy this secret now — it won't be shown again. Only the hash is
						stored.
					</p>
				</div>
				<div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
					<code className="flex-1 text-xs font-mono text-foreground break-all">
						{plaintext}
					</code>
					<CopyInline text={plaintext} />
				</div>
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							void navigate({
								to: "/keys",
								search: { tab: "relay", filter: "active", q: "" },
							})
						}
					>
						Back to keys
					</Button>
					<Button
						type="button"
						onClick={() =>
							void navigate({
								to: "/relay-keys/$name",
								params: { name: savedName },
							})
						}
					>
						View key
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/keys"
					search={{ tab: "relay", filter: "active", q: "" }}
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Relay keys
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New relay key
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Issue a key for an app to call this relay. The secret is generated in
					your browser and shown once after creation.
				</p>
			</div>
			<RelayKeyForm
				onSaved={(name) => setSavedName(name)}
				onCreated={(secret) => setPlaintext(secret)}
				onCancel={() =>
					void navigate({
						to: "/keys",
						search: { tab: "relay", filter: "active", q: "" },
					})
				}
			/>
		</div>
	);
}

function CopyInline({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1_500);
		} catch {
			toast("error", "Couldn't copy to clipboard.");
		}
	}
	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			aria-label="Copy"
			className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
		>
			{copied ? (
				<Check className="w-4 h-4 text-primary" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}

function NewRelayKeyPage() {
	return (
		<Suspense
			fallback={<div className="text-muted-foreground text-sm">Loading…</div>}
		>
			<NewRelayKeyInner />
		</Suspense>
	);
}
