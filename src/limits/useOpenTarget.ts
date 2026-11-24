import { useNavigate } from "@tanstack/react-router";
import type { LimitTarget } from "@/limits/limitWrites";

/** Opens the target's page, where the form was started from. */
export function useOpenTarget(target: LimitTarget) {
	const navigate = useNavigate();
	const params = { name: target.name };
	return () => {
		switch (target.kind) {
			case "team":
				return void navigate({ to: "/teams/$name", params });
			case "project":
				return void navigate({ to: "/projects/$name", params });
			case "serviceaccount":
				return void navigate({ to: "/service-accounts/$name", params });
		}
	};
}
