import { Link } from "@tanstack/react-router";
import type { StoredKey } from "@/byok/useByokWrites";
import { buttonVariants } from "@/components/ui/button";
import { AlertBanner } from "@/shared/AlertBanner";

export function StoredStep({ stored }: { stored: StoredKey }) {
	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<div>
				<h2 className="text-sm font-semibold text-foreground">Key stored</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					{stored.organization
						? `The provider names its organization ${stored.organization}.`
						: "Requests its owner sends can use it now."}
				</p>
			</div>

			{stored.refusal && (
				<AlertBanner
					severity="warn"
					title="The provider refused a call made with this key"
				>
					{stored.refusal} Check the key's value on its page.
				</AlertBanner>
			)}

			{stored.shareFailures.length > 0 && (
				<AlertBanner severity="warn" title="Not shared with everyone">
					<ul className="flex flex-col gap-0.5">
						{stored.shareFailures.map((f) => (
							<li key={f.id}>
								<span className="text-foreground">{f.label}</span>: {f.message}
							</li>
						))}
					</ul>
					<p className="mt-1">Share the account again from its page.</p>
				</AlertBanner>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<Link
					to="/service-accounts/add-agent"
					className={buttonVariants({ variant: "cta", size: "lg" })}
				>
					Add an agent
				</Link>
				<Link
					to="/accounts/$name"
					params={{ name: stored.accountName }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					Open the account
				</Link>
				<Link
					to="/host-keys/$name"
					params={{ name: stored.hostKeyName }}
					className={buttonVariants({ variant: "outline", size: "lg" })}
				>
					View key
				</Link>
			</div>
		</div>
	);
}
