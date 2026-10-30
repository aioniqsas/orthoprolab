import { AuthCookies } from './cookies.js';

const fakeRes = () => ({ cookie: vi.fn(), clearCookie: vi.fn() });
const settings = {
  secure: false,
  sameSite: 'strict' as const,
  accessTtlSeconds: 900,
  refreshTtlDays: 7,
};

describe('AuthCookies', () => {
  it('sets the access cookie: httpOnly, strict, path /, 15 minutes', () => {
    const res = fakeRes();
    new AuthCookies(settings).setAccess(res as never, 'jwt');
    expect(res.cookie).toHaveBeenCalledWith('auth_token', 'jwt', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 900_000,
    });
  });

  it('sets the refresh cookie on / for 7 days so portals can renew it', () => {
    const res = fakeRes();
    new AuthCookies(settings).setRefresh(res as never, 'opaque');
    expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'opaque', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 86_400_000,
    });
  });

  it('drops the legacy /auth-scoped refresh cookie on every write', () => {
    const res = fakeRes();
    new AuthCookies(settings).setRefresh(res as never, 'opaque');
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/auth',
    });
  });

  it('honours Secure and SameSite=Lax from settings', () => {
    const res = fakeRes();
    new AuthCookies({ ...settings, secure: true, sameSite: 'lax' }).setAccess(
      res as never,
      'jwt',
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'auth_token',
      'jwt',
      expect.objectContaining({ secure: true, sameSite: 'lax' }),
    );
  });

  it('clears both cookies with the same attributes (minus maxAge)', () => {
    const res = fakeRes();
    new AuthCookies({ ...settings, secure: true }).clearAll(res as never);
    expect(res.clearCookie).toHaveBeenCalledWith('auth_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
  });
});
