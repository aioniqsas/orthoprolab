"use client";

import { useRouter } from "next/navigation";
import { LogoutButton } from "@repo/ui/auth/logout-button";
import { api } from "@/lib/api";

export function Logout() {
  const router = useRouter();
  return (
    <LogoutButton
      onLogout={() => api.auth.logout()}
      onDone={() => router.replace("/login")}
    />
  );
}
