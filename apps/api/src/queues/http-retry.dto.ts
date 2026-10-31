import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** A portal request that failed and should be replayed by the API. */
export class RetryRequestDto {
  @IsIn(['POST', 'PATCH', 'PUT', 'DELETE'])
  method!: string;

  /** Path only: an absolute URL would turn this into an open proxy. */
  @IsString()
  @MaxLength(500)
  @Matches(/^\/(?!\/)/, { message: 'path must start with a single /' })
  path!: string;

  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
