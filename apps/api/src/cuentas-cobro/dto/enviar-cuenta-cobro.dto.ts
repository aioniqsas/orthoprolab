import { IsEmail } from 'class-validator';

export class EnviarCuentaCobroDto {
  @IsEmail()
  email!: string;
}
