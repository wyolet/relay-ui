import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GroupForm } from "@/groups/GroupForm";
import { BackLink } from "@/shared/BackLink";
import { PageHeader } from "@/shared/PageHeader";

export const Route = createFileRoute("/_authenticated/groups/new")({
	component: NewGroupPage,
});

function NewGroupPage() {
	const navigate = useNavigate();
	return (
		<div>
			<PageHeader
				back={
					<BackLink to="/users" search={{ tab: "groups" }}>
						Groups
					</BackLink>
				}
				title="New group"
				description={
					<>
						Names starting with <code className="font-mono">system:</code> are
						reserved for the built-in virtual groups.
					</>
				}
			/>
			<GroupForm
				onSaved={(name) =>
					void navigate({ to: "/groups/$name", params: { name } })
				}
				onCancel={() =>
					void navigate({ to: "/users", search: { tab: "groups" } })
				}
			/>
		</div>
	);
}
