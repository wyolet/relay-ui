import { Link } from "@tanstack/react-router";
import type { CreatedAgent } from "@/agents/useAgentWrites";
import { buttonVariants } from "@/components/ui/button";
import { KeySnippets, useApiShape } from "@/setup/KeySnippets";
import { relayBaseUrl } from "@/setup/snippets";
import { CopyableValue } from "@/shared/CopyableValue";

export function CreatedStep({
	created,
	models,
}: {
	created: CreatedAgent;
	models: readonly string[];
}) {
	const { shape, setShape } = useApiShape();
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h2 className="text-sm font-semibold text-foreground">Agent created</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Copy the key now. It isn't shown again; only its hash is stored.
				</p>
			</div>

			<CopyableValue value={created.plaintext} copyLabel="Copy key" />

			<p className="text-xs text-muted-foreground">
				Point the agent's client at{" "}
				<code className="font-mono text-foreground">
					{relayBaseUrl(shape.adapter)}
				</code>{" "}
				with this key.
			</p>

			<KeySnippets
				plaintext={created.plaintext}
				models={models}
				shape={shape}
				onShapeChange={setShape}
			/>

			<div className="flex flex-wrap items-center gap-2">
				<Link
					to="/service-accounts/$name"
					params={{ name: created.serviceAccountName }}
					className={buttonVariants({ variant: "cta", size: "lg" })}
				>
					Open the agent
				</Link>
				<Link
					to="/keys/$name"
					params={{ name: created.keyName }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					View key
				</Link>
				{created.policyName && (
					<Link
						to="/policies/$name"
						params={{ name: created.policyName }}
						className={buttonVariants({ variant: "outline", size: "lg" })}
					>
						View policy
					</Link>
				)}
			</div>
		</div>
	);
}
