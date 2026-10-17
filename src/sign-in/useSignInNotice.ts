import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signInErrorNotice } from "@/lib/signInError";

/**
 * The notice for the `?error=<code>` relay or a dropped session sent the
 * browser here with. Read once, then stripped so a reload doesn't repeat it.
 */
export function useSignInNotice(): string | undefined {
	const { error } = useSearch({ from: "/login" });
	const navigate = useNavigate();
	const [code, setCode] = useState(error);

	useEffect(() => {
		if (!error) return;
		setCode(error);
		void navigate({ to: "/login", search: {}, replace: true });
	}, [error, navigate]);

	return code ? signInErrorNotice(code) : undefined;
}
