export type Rol = "administrador" | "clinica" | "odontologo" | "asistente";

export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Rol;
}

export interface LoginBody {
  correo: string;
  password: string;
}

export interface RegisterBody {
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  password: string;
}
