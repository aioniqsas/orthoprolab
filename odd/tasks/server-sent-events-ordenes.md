# Feature: Server-Sent Events para sincronizar órdenes

- Route: delegated direct (API + Next.js portals)
- Status: implemented

## Tasks
- [x] T1 Crear PedidosEventosService (RxJS Subject) en apps/api/src/pedidos
- [x] T2 Registrar/exportar en PedidosModule
- [x] T3 Emitir eventos en PedidosService.create y cambiarEstado
- [x] T4 Endpoint SSE admin: GET /ordenes/eventos
- [x] T5 Endpoint SSE cliente: GET /mi-clinica/ordenes/eventos
- [x] T6 Clientes portal: rewrite /api-proxy + OrdenesLive
- [x] T7 Admin portal: OrdenesLive en listado

## Verification
- API build OK (nest build)
- Admin/clientes build: pre-existing type errors unrelated (usuarios edit, doctor-acciones, ordenes doctor prop)
