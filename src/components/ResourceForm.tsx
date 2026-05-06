import type { ReactNode } from "react";
import { useState } from "react";
import type { ApiErrorBody } from "#/api/types/errors";

// ---------------------------------------------------------------------------
// Field descriptors
// ---------------------------------------------------------------------------

type BaseField = {
	name: string;
	label: string;
	required?: boolean;
	placeholder?: string;
};

export type TextField = BaseField & { type: "text" | "url" | "number" };
export type TextareaField = BaseField & { type: "textarea"; rows?: number };
export type SelectField = BaseField & {
	type: "select";
	options: { value: string; label: string }[];
};
export type MultiSelectField = BaseField & {
	type: "multiselect";
	options: { value: string; label: string }[];
};

export type FieldDef =
	| TextField
	| TextareaField
	| SelectField
	| MultiSelectField;

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

/** All form values are strings or string arrays; callers coerce before submitting. */
export type FormValues = Record<string, string | string[]>;

function validate(
	fields: FieldDef[],
	values: FormValues,
): Record<string, string> {
	const errs: Record<string, string> = {};
	for (const f of fields) {
		const val = values[f.name];
		if (f.required) {
			if (f.type === "multiselect") {
				if (!Array.isArray(val) || val.length === 0) {
					errs[f.name] = "At least one selection is required";
				}
			} else {
				const str = typeof val === "string" ? val.trim() : "";
				if (!str) errs[f.name] = "This field is required";
			}
		}
		if (f.type === "url" && typeof val === "string" && val.trim()) {
			try {
				new URL(val.trim());
			} catch {
				errs[f.name] = "Must be a valid URL";
			}
		}
		if (f.type === "number" && typeof val === "string" && val.trim()) {
			if (Number.isNaN(Number(val))) {
				errs[f.name] = "Must be a number";
			}
		}
	}
	return errs;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResourceFormProps {
	title: string;
	fields: FieldDef[];
	initialValues?: FormValues;
	onSubmit: (values: FormValues) => Promise<void>;
	onCancel: () => void;
	isPending?: boolean;
	/** Structured error from server (4xx). */
	serverError?: ApiErrorBody;
	/** Slot for additional UI between title and fields */
	children?: ReactNode;
}

export function ResourceForm({
	title,
	fields,
	initialValues = {},
	onSubmit,
	onCancel,
	isPending = false,
	serverError,
}: ResourceFormProps) {
	const defaultValues: FormValues = {};
	for (const f of fields) {
		if (f.type === "multiselect") {
			defaultValues[f.name] = initialValues[f.name] ?? [];
		} else {
			defaultValues[f.name] = initialValues[f.name] ?? "";
		}
	}

	const [values, setValues] = useState<FormValues>(defaultValues);
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [submitted, setSubmitted] = useState(false);

	const fieldErrors = validate(fields, values);
	const showErrors = submitted;

	function setValue(name: string, value: string | string[]) {
		setValues((prev) => ({ ...prev, [name]: value }));
		setTouched((prev) => ({ ...prev, [name]: true }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitted(true);
		if (Object.keys(fieldErrors).length > 0) return;
		await onSubmit(values);
	}

	return (
		<div>
			<h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>

			{/* Server error banner */}
			{serverError && (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<p className="font-medium">{serverError.message}</p>
				</div>
			)}

			<form
				onSubmit={(e) => void handleSubmit(e)}
				noValidate
				className="space-y-5 max-w-xl"
			>
				{fields.map((field) => {
					const error =
						showErrors || touched[field.name]
							? fieldErrors[field.name]
							: undefined;
					return (
						<div key={field.name}>
							<label
								htmlFor={field.name}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								{field.label}
								{field.required && (
									<span className="ml-1 text-red-500" aria-hidden="true">
										*
									</span>
								)}
							</label>
							<FieldInput
								field={field}
								value={
									values[field.name] ?? (field.type === "multiselect" ? [] : "")
								}
								onChange={(v) => setValue(field.name, v)}
							/>
							{error && (
								<p role="alert" className="mt-1 text-xs text-red-600">
									{error}
								</p>
							)}
						</div>
					);
				})}

				<div className="flex gap-3 pt-2">
					<button
						type="submit"
						disabled={isPending}
						className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{isPending ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						onClick={onCancel}
						disabled={isPending}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

interface FieldInputProps {
	field: FieldDef;
	value: string | string[];
	onChange: (v: string | string[]) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
	const inputClass =
		"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";

	if (field.type === "textarea") {
		return (
			<textarea
				id={field.name}
				name={field.name}
				rows={field.rows ?? 4}
				value={typeof value === "string" ? value : ""}
				placeholder={field.placeholder}
				onChange={(e) => onChange(e.target.value)}
				className={`${inputClass} resize-y font-mono`}
			/>
		);
	}

	if (field.type === "select") {
		return (
			<select
				id={field.name}
				name={field.name}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => onChange(e.target.value)}
				className={inputClass}
			>
				<option value="">— select —</option>
				{field.options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		);
	}

	if (field.type === "multiselect") {
		const selected = Array.isArray(value) ? value : [];
		return (
			<div className="flex flex-wrap gap-2">
				{field.options.map((opt) => {
					const checked = selected.includes(opt.value);
					return (
						<label
							key={opt.value}
							className={[
								"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-colors",
								checked
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
							].join(" ")}
						>
							<input
								type="checkbox"
								className="sr-only"
								checked={checked}
								onChange={(e) => {
									if (e.target.checked) {
										onChange([...selected, opt.value]);
									} else {
										onChange(selected.filter((v) => v !== opt.value));
									}
								}}
							/>
							{opt.label}
						</label>
					);
				})}
			</div>
		);
	}

	// text / url / number
	return (
		<input
			id={field.name}
			name={field.name}
			type={field.type}
			value={typeof value === "string" ? value : ""}
			placeholder={field.placeholder}
			onChange={(e) => onChange(e.target.value)}
			className={inputClass}
		/>
	);
}
