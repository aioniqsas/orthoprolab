import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Query of every paginated list: the search text, the page window and the
 * sort direction. `size` is clamped by `normalizePagination` (never rejected),
 * and `order` only accepts `asc`/`desc` (anything else is a 400).
 */
export class ListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}

/** `?activo=true|false`: anything else is a 400, not a silently ignored value. */
export function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class ActivoQueryDto extends ListQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  activo?: boolean;
}

/**
 * TypeORM order object for a whitelisted sort key plus the id tiebreak, so two
 * consecutive pages never repeat nor skip a row. The sort key is mapped to the
 * real column here: the request value is never interpolated into SQL.
 */
export function orderByWhitelist(
  whitelist: Record<string, string>,
  tiebreak: string,
  opts: { sort?: string; order?: SortOrder },
  defaultSort: string,
  defaultDirection: 'ASC' | 'DESC' = 'DESC',
): Record<string, 'ASC' | 'DESC'> {
  // Own keys only: an inherited name (`constructor`, `__proto__`, `toString`)
  // must fall back to the default, never become a column.
  const key =
    opts.sort && Object.hasOwn(whitelist, opts.sort) ? opts.sort : defaultSort;
  const direction =
    opts.order !== undefined
      ? opts.order === 'asc'
        ? 'ASC'
        : 'DESC'
      : defaultDirection;
  return { [whitelist[key]]: direction, [tiebreak]: direction };
}
