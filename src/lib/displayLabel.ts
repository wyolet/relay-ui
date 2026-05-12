import type { components } from "@/api/types.gen";

type MetadataLike = Pick<
	components["schemas"]["Metadata"],
	"name" | "displayName"
>;

export function displayLabel(meta: MetadataLike): string {
	const dn = meta.displayName?.trim();
	return dn ? dn : meta.name;
}

export function hasDisplayName(meta: MetadataLike): boolean {
	return Boolean(meta.displayName?.trim());
}
