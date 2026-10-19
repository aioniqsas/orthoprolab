import type { Request } from 'express';
import { extractAuthCookie, parseJwtPayload } from './jwt.strategy.js';

const req = (over: Record<string, unknown>) => over as unknown as Request;

describe('extractAuthCookie', () => {
  it('reads the auth_token cookie', () => {
    expect(extractAuthCookie(req({ cookies: { auth_token: 'abc' } }))).toBe(
      'abc',
    );
  });

  it('ignores the Authorization header', () => {
    expect(
      extractAuthCookie(
        req({ headers: { authorization: 'Bearer abc' }, cookies: {} }),
      ),
    ).toBeNull();
  });

  it('returns null without cookies or with a non-string value', () => {
    expect(extractAuthCookie(req({}))).toBeNull();
    expect(extractAuthCookie(req({ cookies: { auth_token: 5 } }))).toBeNull();
    expect(extractAuthCookie(req({ cookies: { auth_token: '' } }))).toBeNull();
  });

  it('does not read the refresh cookie', () => {
    expect(
      extractAuthCookie(req({ cookies: { refresh_token: 'abc' } })),
    ).toBeNull();
  });
});

describe('parseJwtPayload', () => {
  const sub = '6f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
  const sid = '7f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

  it('maps a valid payload', () => {
    expect(parseJwtPayload({ sub, rol: 'admin', sid })).toEqual({
      id: sub,
      rol: 'admin',
      sid,
    });
  });

  it.each([
    null,
    'x',
    {},
    {
      sub: 'not-a-uuid',
      rol: 'a',
      sid: '7f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    },
    {
      sub: '6f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      rol: '',
      sid: '7f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    },
    { sub: '6f1c2d34-5a6b-4c7d-8e9f-0a1b2c3d4e5f', rol: 'a', sid: 5 },
  ])('rejects malformed payload %j', (payload) => {
    expect(parseJwtPayload(payload)).toBeNull();
  });
});
