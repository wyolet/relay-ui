import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { GroupForm } from "@/groups/GroupForm";

export const Route = createFileRoute("/_authenticated/groups/new")({
	component: NewGroupPage,
});

function NewGroupPage() {
	const navigate = useNavigate();
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Link
					to="/groups"
					className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					<ChevronLeft className="w-3.5 h-3.5" />
					Groups
				</Link>
				<h1 className="mt-2 text-xl font-semibold text-foreground">
					New group
				</h1>
				<p className="mt-1 text-xs text-muted-foreground">
					Names starting with <code className="font-mono">system:</code> are
					reserved for the built-in virtual groups.
				</p>
			</div>
			<GroupForm
				onSaved={(name) =>
					void navigate({ to: "/groups/$name", params: { name } })
				}
				onCancel={() => void navigate({ to: "/groups" })}
			/>
		</div>
	);
}
