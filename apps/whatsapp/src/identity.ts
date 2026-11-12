export type Identity = { clinicId: string; doctorId?: string }

/** T5 will replace this boundary with the API-backed allowlist resolver. */
export async function resolveIdentity(_senderId: string): Promise<Identity | undefined> {
  return undefined
}
