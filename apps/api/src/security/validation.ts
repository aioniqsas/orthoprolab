import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';

/** Flattens nested errors into "path: first message" strings. No values. */
function collectMessages(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent === '' ? error.property : `${parent}.${error.property}`;
    const own = Object.values(error.constraints ?? {}).slice(0, 1);
    const nested = collectMessages(error.children ?? [], path);
    return [...own, ...nested];
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    message: collectMessages(errors),
    error: 'Bad Request',
  });
}

/**
 * Global pipe: unknown fields are rejected (never silently stripped), input is
 * transformed to DTO instances, and errors never echo the rejected values.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: true,
    validationError: { target: false, value: false },
    exceptionFactory: validationExceptionFactory,
  });
}
