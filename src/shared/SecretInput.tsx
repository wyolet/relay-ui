import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * An API key or token field. A password input makes browsers offer to fill,
 * generate or save a login password, so this is a text input masked with CSS
 * that password managers are told to skip.
 */
export function SecretInput({
	className,
	...props
}: Omit<ComponentProps<"input">, "type" | "autoComplete">) {
	const [reveal, setReveal] = useState(false);
	return (
		<div className={cn("relative", className)}>
			<Input
				{...props}
				type="text"
				autoComplete="off"
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck={false}
				data-1p-ignore
				data-lpignore="true"
				data-bwignore="true"
				data-form-type="other"
				className={cn(
					"pr-9 font-mono",
					!reveal && "[-webkit-text-security:disc]",
				)}
			/>
			<IconButton
				icon={reveal ? EyeOff : Eye}
				label={reveal ? "Hide value" : "Show value"}
				weight="bare"
				size="sm"
				onClick={() => setReveal((v) => !v)}
				className="absolute right-1.5 top-1/2 -translate-y-1/2"
			/>
		</div>
	);
}
