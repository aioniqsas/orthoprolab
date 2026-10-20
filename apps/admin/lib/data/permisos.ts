import type { PermisoFila } from "./types";

/**
 * Permission matrix, limited to what the product has decided or what follows
 * from the schema/portal gating. Anything else is `por_definir`: do NOT invent
 * a permission model here.
 *
 * Sources: portal gating (admin portal = `administrador`; clientes portal =
 * `odontologo` and `asistente`), `docs/database-model.md` (`asistente_doctor`,
 * one role per user).
 */
export const PERMISOS: PermisoFila[] = [
  {
    id: "portal-admin",
    capacidad: "Entrar al portal de administración",
    roles: {
      administrador: { nivel: "si" },
      odontologo: { nivel: "no" },
      asistente: { nivel: "no" },
    },
  },
  {
    id: "portal-clientes",
    capacidad: "Entrar al portal de clientes",
    roles: {
      administrador: { nivel: "no" },
      odontologo: { nivel: "si" },
      asistente: { nivel: "si" },
    },
  },
  {
    id: "gestion-admin",
    capacidad: "Gestionar órdenes, clínicas, usuarios, catálogo y web",
    roles: {
      administrador: { nivel: "si", nota: "Gestiona todo en el portal de administración" },
      odontologo: { nivel: "no" },
      asistente: { nivel: "no" },
    },
  },
  {
    id: "ordenes-propias",
    capacidad: "Crear y ver sus órdenes",
    roles: {
      administrador: { nivel: "no", nota: "Ve todas las órdenes desde el portal de administración" },
      odontologo: { nivel: "si", nota: "Sus propias órdenes" },
      asistente: { nivel: "delegado", nota: "En nombre del odontólogo asignado (asistente_doctor)" },
    },
  },
  {
    id: "pacientes-propios",
    capacidad: "Ver y registrar sus pacientes",
    roles: {
      administrador: { nivel: "por_definir" },
      odontologo: { nivel: "si", nota: "Sus propios pacientes" },
      asistente: { nivel: "delegado", nota: "En nombre del odontólogo asignado (asistente_doctor)" },
    },
  },
  {
    id: "cambiar-estado",
    capacidad: "Cambiar el estado de una orden",
    roles: {
      administrador: { nivel: "por_definir" },
      odontologo: { nivel: "por_definir" },
      asistente: { nivel: "por_definir" },
    },
  },
  {
    id: "limites-asistente",
    capacidad: "Alcance exacto de lo que un asistente puede hacer por su odontólogo",
    roles: {
      administrador: { nivel: "por_definir" },
      odontologo: { nivel: "por_definir" },
      asistente: { nivel: "por_definir" },
    },
  },
];
