import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Building2,
	ChevronsUpDown,
	KeyRound,
	KeySquare,
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
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { versionLabel } from "@/lib/versionLabel";
import { Segmented } from "@/shared/Segmented";
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
	const { logout, username, userId, isAdmin } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const [tokensOpen, setTokensOpen] = useState(false);
	const [accessOpen, setAccessOpen] = useState(false);
	// Off under RELAY_AUTHZ=single and on relays predating access reviews.
	const canCheckAccess = feature("accessReview");
	// No signing key wired means nothing to mint; the endpoint 503s.
	const tokensEnabled = feature("tokens");
	const label = username ?? "Account";
	const initial = label.charAt(0).toUpperCase();
	const roleLabel = isAdmin ? "Relay admin" : "Member";

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<SidebarMenuButton
									size="lg"
									tooltip={label}
									className="data-popup-open:text-sidebar-accent-foreground data-popup-open:before:opacity-100"
								/>
							}
						>
							<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
								{initial}
							</span>
							<span className="grid min-w-0 flex-1 leading-tight">
								<span className="truncate text-sm font-medium text-foreground">
									{label}
								</span>
								<span className="truncate text-[11px] text-muted-foreground">
									{roleLabel}
								</span>
							</span>
							<ChevronsUpDown className="ml-auto text-muted-foreground" />
						</DropdownMenuTrigger>

						<DropdownMenuContent
							side="right"
							align="end"
							sideOffset={8}
							className="w-60"
						>
							<div className="flex items-center gap-2.5 px-2 py-1.5">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
									{initial}
								</span>
								<div className="min-w-0" title={userId}>
									<div className="truncate text-sm font-medium text-foreground">
										{label}
									</div>
									<div className="truncate text-[11px] text-muted-foreground">
										{roleLabel}
									</div>
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

							{userId && (
								<DropdownMenuItem
									render={
										<Link
											to="/keys"
											search={{ principal_kind: "user", principal_id: userId }}
										/>
									}
								>
									<KeySquare />
									Your keys
								</DropdownMenuItem>
							)}

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

							<DropdownMenuItem
								variant="destructive"
								onClick={() => void logout()}
							>
								<LogOut />
								Sign out
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							<div className="px-1 py-1">
								<ThemeSegment />
							</div>

							<dl className="grid grid-cols-[auto_1fr] gap-x-3 px-2 pb-1 pt-0.5 text-[10px] text-muted-foreground">
								<dt title="The Relay server this interface talks to">Relay</dt>
								<dd className="truncate text-right font-mono">
									{versionLabel(versionData?.version)}
								</dd>
								<dt title="This interface's build">UI</dt>
								<dd className="truncate text-right font-mono">
									{versionLabel(import.meta.env.VITE_UI_VERSION)}
								</dd>
							</dl>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			{tokensOpen && <TokenDialog onClose={() => setTokensOpen(false)} />}
			{accessOpen && <AccessCheckDialog onClose={() => setAccessOpen(false)} />}
		</>
	);
}
