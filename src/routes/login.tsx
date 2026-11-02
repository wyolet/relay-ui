import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { whoamiQueryOptions } from "@/api/auth";
import { LoginPage } from "@/sign-in/LoginPage";

const searchSchema = z.object({
	error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
	validateSearch: searchSchema,
	async beforeLoad({ context }) {
		const whoami =
			await context.queryClient.ensureQueryData(whoamiQueryOptions);
		if (whoami.authenticated) throw redirect({ to: "/" });
	},
	component: LoginPage,
});
