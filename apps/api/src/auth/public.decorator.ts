import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'orthopro:public';

/** Opts a route (or controller) out of the global JWT guard. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
