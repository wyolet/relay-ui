import type { LucideIcon } from "lucide-react";
import { Boxes, Building2, Globe } from "lucide-react";
import type { CatalogRefKind } from "@/lib/catalogRef";

export const KIND_META: Record<
	CatalogRefKind,
	{ icon: LucideIcon; label: string }
> = {
	provider: { icon: Building2, label: "Provider" },
	"provider-on-host": { icon: Building2, label: "Provider · host" },
	model: { icon: Boxes, label: "Model" },
	binding: { icon: Boxes, label: "Model · host" },
	host: { icon: Globe, label: "Host" },
};
