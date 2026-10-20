import { createApiClient } from "@repo/api-client";

/** Single place where the API base URL is read. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3003";

export const api = createApiClient({ baseUrl: API_URL });
