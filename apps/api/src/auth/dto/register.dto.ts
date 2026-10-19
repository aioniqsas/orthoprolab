import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { normalizeEmail } from './login.dto.js';

/** Letters (incl. accents), spaces, apostrophes and hyphens. */
const NAME = /^\p{L}[\p{L}\s'’-]*$/u;
const NAME_MESSAGE =
  'must contain only letters, spaces, apostrophes and hyphens';

export class RegisterDto {
  @IsString()
  @Length(1, 100)
  @Matches(NAME, { message: `nombres ${NAME_MESSAGE}` })
  nombres!: string;

  @IsString()
  @Length(1, 100)
  @Matches(NAME, { message: `apellidos ${NAME_MESSAGE}` })
  apellidos!: string;

  @IsString()
  @Matches(/^\d{5,12}$/, { message: 'cedula must be 5 to 12 digits' })
  cedula!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  correo!: string;

  @IsString()
  @Length(12, 200)
  password!: string;
}
