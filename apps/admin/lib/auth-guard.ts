import "server-only";
import { getAccess } from "./session";

/**
 * Pages re-check access themselves (the layout only gates presentation).
 * Returns false when the caller is not an allowed administrator, in which
 * case the page must render nothing (the layout already shows the notice).
 */
export async function isAdmin(): Promise<boolean> {
  return (await getAccess()).kind === "allowed";
}
