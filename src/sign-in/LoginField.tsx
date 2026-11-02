import { Eye, EyeOff, type User } from "lucide-react";
import { useState } from "react";
import {
	fieldFocusWithinClassName,
	fieldFrameClassName,
} from "@/components/ui/field-focus";
import { IconButton } from "@/components/ui/icon-button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LoginFieldProps {
	id: string;
	label: string;
	type: "text" | "password";
	autoComplete: string;
	icon: typeof User;
	value: string;
	onChange: (value: string) => void;
	onBlur: () => void;
	error: string | undefined;
	disabled: boolean;
}

/** Login field on the shared field system: the wrapper carries the mauve
 *  frame + focus-within wash/settle, the inner input stays naked. */
export function LoginField({
	id,
	label,
	type,
	autoComplete,
	icon: Icon,
	value,
	onChange,
	onBlur,
	error,
	disabled,
}: LoginFieldProps) {
	const hasError = error !== undefined;
	const isPassword = type === "password";
	const [reveal, setReveal] = useState(false);
	const inputType = isPassword && reveal ? "text" : type;
	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<div
				className={cn(
					fieldFrameClassName,
					fieldFocusWithinClassName,
					"flex h-11 items-center gap-2.5 px-3 transition-[border-color,background-color]",
					hasError && "border-destructive",
				)}
			>
				<Icon
					className="size-4 shrink-0 text-muted-foreground/70"
					aria-hidden
				/>
				<input
					id={id}
					type={inputType}
					autoComplete={autoComplete}
					required
					disabled={disabled}
					value={value}
					onChange={(e) => onChange(e.currentTarget.value)}
					onBlur={onBlur}
					aria-invalid={hasError || undefined}
					aria-describedby={hasError ? `${id}-error` : undefined}
					className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
				/>
				{isPassword && (
					<IconButton
						icon={reveal ? EyeOff : Eye}
						label={reveal ? "Hide password" : "Show password"}
						weight="bare"
						size="sm"
						tabIndex={-1}
						onClick={() => setReveal((v) => !v)}
						disabled={disabled}
					/>
				)}
			</div>
			{hasError && (
				<p id={`${id}-error`} role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
