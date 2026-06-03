/**
 * API "shapes" the user can target. We position like OpenRouter: every provider
 * is reachable through the OpenAI wire format (the `openai` adapter), so one
 * client shape works for all models regardless of upstream. Relay also exposes
 * its own canonical shape (close to the OpenAI Responses API) for callers that
 * want our native surface.
 *
 * The `adapter` is the data-plane path segment → `/{adapter}/v1`.
 */
export interface ApiShape {
	id: "openai" | "canonical";
	label: string;
	/** Short note shown under the picker. */
	blurb: string;
	adapter: string;
}

export const API_SHAPES: ApiShape[] = [
	{
		id: "openai",
		label: "OpenAI-compatible",
		blurb: "Drop-in OpenAI shape — works with every model, any OpenAI client.",
		adapter: "openai",
	},
	// TODO(canonical): add the Wyolet canonical shape once its adapter path is
	// confirmed (close to the OpenAI Responses API).
];

export const DEFAULT_SHAPE: ApiShape = API_SHAPES[0];
