import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

/** Numeric string ids only (bigint, up to 18 digits): anything else is 400. */
@Injectable()
export class ServicioIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[1-9]\d{0,17}$/.test(value)) {
      throw new BadRequestException('id must be a positive integer');
    }
    return value;
  }
}
