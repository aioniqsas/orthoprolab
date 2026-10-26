import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    String(value as string)
      .toLowerCase()
      .trim(),
  )
  @IsEmail()
  correo!: string;
}
