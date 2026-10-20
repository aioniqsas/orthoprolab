import { z } from "zod";

/** Mirrors the validation rules of the NestJS auth DTOs (apps/api/src/auth/dto). */

const NAME_PATTERN = /^[\p{L}\p{M}\s'’-]+$/u;

const name = (label: string) =>
  z
    .string({ error: `Ingresa ${label}.` })
    .trim()
    .min(1, `Ingresa ${label}.`)
    .max(100, `${label[0]?.toUpperCase()}${label.slice(1)} admite hasta 100 caracteres.`)
    .regex(
      NAME_PATTERN,
      "Usa solo letras, espacios, apostrofes y guiones.",
    );

const correo = z
  .string({ error: "Ingresa tu correo electrónico." })
  .trim()
  .toLowerCase()
  .max(254, "El correo admite hasta 254 caracteres.")
  .pipe(z.email("Ingresa un correo electrónico válido."));

export const loginSchema = z.strictObject({
  correo,
  password: z
    .string({ error: "Ingresa tu contraseña." })
    .min(1, "Ingresa tu contraseña.")
    .max(200, "La contraseña admite hasta 200 caracteres."),
});

export const PASSWORD_RULE_HINT = "12 a 200 caracteres";

export const registerSchema = z.strictObject({
  nombres: name("tus nombres"),
  apellidos: name("tus apellidos"),
  cedula: z
    .string({ error: "Ingresa tu cédula." })
    .trim()
    .regex(/^\d+$/, "La cédula debe contener solo dígitos.")
    .min(5, "La cédula debe tener entre 5 y 12 dígitos.")
    .max(12, "La cédula debe tener entre 5 y 12 dígitos."),
  correo,
  password: z
    .string({ error: "Ingresa una contraseña." })
    .min(12, "La contraseña debe tener al menos 12 caracteres.")
    .max(200, "La contraseña admite hasta 200 caracteres."),
});

/** Form-only schema: adds confirmPassword, which is never sent to the API. */
export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string({ error: "Confirma tu contraseña." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterFormValues = z.input<typeof registerFormSchema>;

/** Picks only the fields the API accepts and normalizes text fields. */
export function toRegisterPayload(
  values: RegisterInput & { confirmPassword?: string },
): RegisterInput {
  return {
    nombres: values.nombres.trim(),
    apellidos: values.apellidos.trim(),
    cedula: values.cedula.trim(),
    correo: values.correo.trim().toLowerCase(),
    password: values.password,
  };
}
