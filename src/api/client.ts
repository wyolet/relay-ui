import createClient from 'openapi-fetch'
import type { paths } from './types.gen'

/**
 * Typed API client generated from the Relay OpenAPI spec.
 * Base URL defaults to the same origin so it works behind the /ui/ prefix
 * when embedded in the Go binary.
 */
export const apiClient = createClient<paths>({
  baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080',
})
