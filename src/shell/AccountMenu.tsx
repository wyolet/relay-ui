import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Building2,
	ChevronsUpDown,
	Cog,
	KeyRound,
	LogOut,
	Monitor,
	Moon,
	ShieldQuestion,
	Sun,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { AccessCheckDialog } from "@/access-review/AccessCheckDialog";
import { useAuth } from "@/api/auth";
import { versionQueryOptions } from "@/api/queries/dashboard";
import { feature } from "@/api/runtimeConfig";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { versionLabel } from "@/lib/versionLabel";
import { Segmented } from "@/shared/Segmented";
import { headerTriggerClass } from "@/shell/headerTrigger";
import { type Theme, useTheme } from "@/stores/theme";
import { TokenDialog } from "@/tokens/TokenDialog";

const THEME_CYCLE: Theme[] = ["light", "dark", "system"];
const THEME_ICON: Record<Theme, ComponentType<{ className?: string }>> = {
	light: Sun,
	dark: Moon,
	system: Monitor,
};

function ThemeSegment() {
	const { theme, setTheme } = useTheme();
	return (
		<Segmented
			stretch
			value={theme}
			onChange={setTheme}
			options={THEME_CYCLE.map((t) => {
				const Icon = THEME_ICON[t];
				return {
					value: t,
					ariaLabel: `Theme: ${t}`,
					label: <Icon className="size-3.5" />,
				};
			})}
		/>
	);
}

export function AccountMenu() {
	const { logout, username, userId } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const [tokensOpen, setTokensOpen] = useState(false);
	const [accessOpen, setAccessOpen] = useState(false);
	// Off under RELAY_AUTHZ=single and on relays predating access reviews.
	const canCheckAccess = feature("accessReview");
	// No signing key wired means nothing to mint; the endpoint 503s.
	const tokensEnabled = feature("tokens");
	const label = username ?? "Account";
	const initial = label.charAt(0).toUpperCase();

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger className={headerTriggerClass}>
					<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
						{initial}
					</span>
					<span className="max-w-32 truncate font-medium">{label}</span>
					<ChevronsUpDown className="size-3.5 text-muted-foreground" />
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" sideOffset={6} className="w-60">
					<div className="flex items-center gap-2.5 px-2 py-1.5">
						<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
							{initial}
						</span>
						<div className="min-w-0">
							<div className="truncate text-sm font-medium text-foreground">
								{label}
							</div>
							{userId && (
								<div
									className="truncate font-mono text-[11px] text-muted-foreground"
									title={userId}
								>
									{userId.slice(0, 8)}
								</div>
							)}
						</div>
					</div>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						render={
							<Link to="/keys" search={{ tab: "accounts", mine: true }} />
						}
					>
						<Building2 />
						Your accounts
					</DropdownMenuItem>

					{tokensEnabled && (
						<DropdownMenuItem onClick={() => setTokensOpen(true)}>
							<KeyRound />
							Inference tokens
						</DropdownMenuItem>
					)}

					{canCheckAccess && (
						<DropdownMenuItem onClick={() => setAccessOpen(true)}>
							<ShieldQuestion />
							Check my access
						</DropdownMenuItem>
					)}

					<DropdownMenuItem render={<Link to="/settings" />}>
						<Cog />
						Settings
					</DropdownMenuItem>

					<DropdownMenuItem variant="destructive" onClick={() => void logout()}>
						<LogOut />
						Sign out
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<div className="px-1 py-1">
						<ThemeSegment />
					</div>

					<div className="flex items-center justify-between gap-2 px-2 pb-1 pt-0.5 text-[10px] text-muted-foreground">
						<span title="The Relay server this interface talks to">
							Relay {versionLabel(versionData?.version)}
						</span>
						<span title="This interface's build">
							UI {versionLabel(import.meta.env.VITE_UI_VERSION)}
						</span>
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
			{tokensOpen && <TokenDialog onClose={() => setTokensOpen(false)} />}
			{accessOpen && <AccessCheckDialog onClose={() => setAccessOpen(false)} />}
		</>
	);
}
