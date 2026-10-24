import type { PermisoFila } from "./types";

/**
 * Permission matrix for the two active roles post-refactor.
 * Sources: portal gating (admin portal = `administrador`; clientes portal = `clinica`),
 * `docs/database-model.md`.
 */
export const PERMISOS: PermisoFila[] = [
  {
    id: "portal-admin",
    capacidad: "Entrar al portal de administración",
    roles: {
      administrador: { nivel: "si" },
      clinica: { nivel: "no" },
    },
  },
  {
    id: "portal-clientes",
    capacidad: "Entrar al portal de clientes",
    roles: {
      administrador: { nivel: "no" },
      clinica: { nivel: "si" },
    },
  },
  {
    id: "gestion-admin",
    capacidad: "Gestionar órdenes, clínicas, usuarios, catálogo y web",
    roles: {
      administrador: { nivel: "si", nota: "Gestiona todo en el portal de administración" },
      clinica: { nivel: "no" },
    },
  },
  {
    id: "ordenes-propias",
    capacidad: "Crear y ver sus órdenes",
    roles: {
      administrador: { nivel: "no", nota: "Ve todas las órdenes desde el portal de administración" },
      clinica: { nivel: "si", nota: "Las órdenes de su clínica" },
    },
  },
  {
    id: "pacientes-propios",
    capacidad: "Ver y registrar sus pacientes",
    roles: {
      administrador: { nivel: "por_definir" },
      clinica: { nivel: "si", nota: "Los pacientes de los doctores de su clínica" },
    },
  },
  {
    id: "cambiar-estado",
    capacidad: "Cambiar el estado de una orden",
    roles: {
      administrador: { nivel: "por_definir" },
      clinica: { nivel: "por_definir" },
    },
  },
  {
    id: "cuentas-cobro",
    capacidad: "Ver sus cuentas de cobro",
    roles: {
      administrador: { nivel: "si", nota: "Crea y gestiona todas las cuentas de cobro" },
      clinica: { nivel: "si", nota: "Solo las cuentas de cobro de su clínica" },
    },
  },
];
