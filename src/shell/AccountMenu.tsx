import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ChevronsUpDown,
	Cog,
	KeyRound,
	LogOut,
	Monitor,
	Moon,
	Sun,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { useAuth } from "@/api/auth";
import { versionQueryOptions } from "@/api/queries/dashboard";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Chip } from "@/shared/Chip";
import { Segmented } from "@/shared/Segmented";
import { useActorAccess } from "@/shell/actorScopes";
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

/** The actor's roles and scopes, read-only — granting them is an admin's job
 * on the role-bindings page. */
function ActorAccess() {
	const { roles, scopes } = useActorAccess();
	if (roles.length === 0 && scopes.length === 0) return null;

	return (
		<>
			<DropdownMenuSeparator />
			<div className="flex flex-col gap-2 px-2 py-1.5">
				{roles.length > 0 && (
					<div>
						<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							Roles
						</div>
						<div className="mt-1 flex flex-wrap gap-1">
							{roles.map((r) => (
								<Chip key={r} label={r} tone="primary" />
							))}
						</div>
					</div>
				)}
				{scopes.length > 0 && (
					<div>
						<div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
							Scopes
						</div>
						<div className="mt-1 flex flex-col gap-0.5">
							{scopes.map((s) => (
								<div key={s.scope} className="truncate text-[11px]">
									<span className="text-muted-foreground">{s.kind}</span>{" "}
									<span className="text-foreground">{s.name}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

export function AccountMenu() {
	const { logout, username, userId } = useAuth();
	const { data: versionData } = useQuery(versionQueryOptions);
	const [tokensOpen, setTokensOpen] = useState(false);
	const label = username ?? "Account";
	const initial = label.charAt(0).toUpperCase();

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						"flex h-8 items-center gap-2 rounded-md pl-1 pr-1.5 text-sm transition-colors",
						"text-foreground hover:bg-muted",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
					)}
				>
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
								<div className="truncate font-mono text-[11px] text-muted-foreground">
									{userId}
								</div>
							)}
						</div>
					</div>

					<ActorAccess />

					<DropdownMenuSeparator />

					<DropdownMenuItem onClick={() => setTokensOpen(true)}>
						<KeyRound />
						Inference tokens
					</DropdownMenuItem>

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

					{versionData && (
						<div className="flex items-center justify-between px-2 pb-1 pt-0.5 text-[10px] tabular-nums text-muted-foreground">
							<span>backend</span>
							<span className="font-mono">{versionData.version}</span>
						</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{tokensOpen && <TokenDialog onClose={() => setTokensOpen(false)} />}
		</>
	);
}
