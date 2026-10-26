import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsString()
  @MinLength(64)
  @MaxLength(64)
  token!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  nuevaPassword!: string;
}
