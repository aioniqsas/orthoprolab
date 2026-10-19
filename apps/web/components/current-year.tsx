import { cacheLife } from "next/cache";

/** Renders the current year; the cache entry expires daily so it never goes stale. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
