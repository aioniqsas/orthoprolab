import { isAdmin } from "@/lib/auth-guard";
import { listOrdenes } from "@/lib/data/repository";
import { OrdersTable } from "./orders-table";

export async function OrdersView() {
  if (!(await isAdmin())) return null;
  const ordenes = await listOrdenes();
  return <OrdersTable ordenes={ordenes} />;
}
