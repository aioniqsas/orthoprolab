import type { NextFunction, Request, Response } from 'express';
import { createOriginCheck } from './origin.middleware.js';

describe('createOriginCheck', () => {
  const check = createOriginCheck(['http://localhost:3000']);

  function run(method: string, origin?: string) {
    const req = { method, headers: origin ? { origin } : {} } as Request;
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
    const next = vi.fn();
    check(req, res as unknown as Response, next as unknown as NextFunction);
    return { res, next };
  }

  it('rejects unsafe methods from a disallowed Origin with 403', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const { res, next } = run(method, 'https://evil.example');
      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('rejects the opaque "null" origin on unsafe methods', () => {
    expect(run('POST', 'null').res.statusCode).toBe(403);
  });

  it('allows unsafe methods with an allowed Origin or without Origin', () => {
    expect(run('POST', 'http://localhost:3000').next).toHaveBeenCalled();
    expect(run('DELETE').next).toHaveBeenCalled();
  });

  it('never blocks safe methods', () => {
    expect(run('GET', 'https://evil.example').next).toHaveBeenCalled();
    expect(run('OPTIONS', 'https://evil.example').next).toHaveBeenCalled();
  });
});
