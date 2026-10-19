export const AUTH_COOKIE = 'auth_token';
export const REFRESH_COOKIE = 'refresh_token';

/**
 * Role given to everybody who signs up through the public endpoint. Nobody can
 * choose a role in the payload.
 * TODO: revisit with the client (doctors belong to a clinic, so public
 * registration may be replaced by admin-managed onboarding).
 */
export const PUBLIC_REGISTRATION_ROLE = 'odontologo';

export const REGISTER_FAILURE_MESSAGE =
  'No pudimos completar el registro en este momento. Intentalo de nuevo mas tarde.';
