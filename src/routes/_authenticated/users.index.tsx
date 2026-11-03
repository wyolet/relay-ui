import type { QueryClient } from "@tanstack/react-query";
import {
	CatchBoundary,
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { groupsListQuery } from "@/api/hooks/groups";
import { licenseQueryOptions } from "@/api/hooks/license";
import { projectsListQueryOptions } from "@/api/hooks/projects";
import { roleBindingsListQuery } from "@/api/hooks/roleBindings";
import { rolesListQuery, rolesListQueryOptions } from "@/api/hooks/roles";
import { teamsListQueryOptions } from "@/api/hooks/teams";
import { usersListQueryOptions } from "@/api/hooks/users";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupsTable, toGroupsParams } from "@/groups/GroupsTable";
import { awaitOnEnter } from "@/lib/awaitOnEnter";
import {
	RoleBindingsTable,
	toRoleBindingsParams,
} from "@/role-bindings/RoleBindingsTable";
import { RolesTable, toRolesParams } from "@/roles/RolesTable";
import { NoAccessState, RouteErrorState } from "@/shared/RouteError";
import { PageLoader } from "@/shared/Spinner";
import { UsersTable } from "@/users/UsersTable";
import {
	USERS_PAGE_TABS,
	type UsersPageTab,
	useUsersPageTabs,
} from "@/users/useUsersPageTabs";

const TAB_LABELS: Record<UsersPageTab, string> = {
	users: "Users",
	groups: "Groups",
	roles: "Roles",
	"role-bindings": "Role bindings",
};

const searchSchema = z.object({
	tab: z.enum(USERS_PAGE_TABS).default("users"),
	// Filters of the groups, roles and role-bindings tabs; a tab change clears them.
	q: z.string().default(""),
	enabled: z.enum(["all", "true", "false"]).catch("all").default("all"),
	role_id: z.string().catch("").default(""),
	scope_kind: z
		.enum(["all", "system", "team", "project"])
		.catch("all")
		.default("all"),
	scope_id: z.string().catch("").default(""),
	subject: z.string().catch("").default(""),
});

type UsersPageSearch = z.infer<typeof searchSchema>;

function loadTab(
	queryClient: QueryClient,
	search: UsersPageSearch,
): Promise<unknown> {
	switch (search.tab) {
		case "users":
			return queryClient.ensureQueryData(usersListQueryOptions);
		case "groups":
			return queryClient.ensureQueryData(
				groupsListQuery(toGroupsParams(search)),
			);
		case "roles":
			void queryClient.prefetchQuery(licenseQueryOptions);
			return queryClient.ensureQueryData(rolesListQuery(toRolesParams(search)));
		case "role-bindings":
			return Promise.all([
				queryClient.ensureQueryData(
					roleBindingsListQuery(toRoleBindingsParams(search)),
				),
				queryClient.ensureQueryData(rolesListQueryOptions),
				queryClient.ensureQueryData(teamsListQueryOptions),
				queryClient.ensureQueryData(projectsListQueryOptions),
			]);
	}
}

export const Route = createFileRoute("/_authenticated/users/")({
	validateSearch: searchSchema,
	// Defaults stay out of the URL.
	search: { middlewares: [stripSearchParams(searchSchema.parse({}))] },
	loaderDeps: ({ search }) => ({ ...search }),
	// A refused list must not reach the route error boundary: the tab hides
	// once its capability probe answers, and the page falls back to another.
	loader: ({ context, deps, cause }) =>
		awaitOnEnter(
			cause,
			loadTab(context.queryClient, deps).catch(() => undefined),
		),
	component: UsersPage,
});

function UsersPage() {
	const navigate = useNavigate({ from: "/users" });
	const search = Route.useSearch();
	const loadedAt = Route.useMatch({ select: (m) => m.updatedAt });
	const { visible, active } = useUsersPageTabs(search.tab);

	function setTab(value: unknown) {
		const tab = USERS_PAGE_TABS.find((t) => t === value) ?? "users";
		void navigate({ search: { tab } });
	}

	return (
		<div>
			<div className="mb-4">
				<h1 className="text-lg font-semibold text-foreground">Users</h1>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Accounts that sign in, the groups they form, and the roles bound to
					them.
				</p>
			</div>
			{active === undefined ? (
				<NoAccessState />
			) : (
				<>
					<Tabs value={active} onValueChange={setTab} className="mb-4">
						<TabsList variant="underline">
							{visible.map((tab) => (
								<TabsTrigger key={tab} value={tab} className="px-3 h-9">
									{TAB_LABELS[tab]}
								</TabsTrigger>
							))}
						</TabsList>
					</Tabs>
					{/* A capability probe still in flight counts as allowed, so a tab
					    may render before its 403; keep that inside the tab body. */}
					<CatchBoundary
						getResetKey={() => `${active}:${loadedAt}`}
						errorComponent={RouteErrorState}
					>
						<Suspense fallback={<PageLoader className="min-h-[40vh]" />}>
							{active === "users" && <UsersTable />}
							{active === "groups" && <GroupsTable />}
							{active === "roles" && <RolesTable />}
							{active === "role-bindings" && <RoleBindingsTable />}
						</Suspense>
					</CatchBoundary>
				</>
			)}
		</div>
	);
}
