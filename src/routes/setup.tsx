import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { SetupWizard } from "@/setup/SetupWizard";
import { PageLoader } from "@/shared/Spinner";

export const Route = createFileRoute("/setup")({
	component: SetupPage,
});

function SetupPage() {
	return (
		<Suspense fallback={<PageLoader />}>
			<SetupWizard />
		</Suspense>
	);
}
