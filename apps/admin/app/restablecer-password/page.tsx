import { Suspense } from "react";
import { RestablecerPasswordContent } from "./restablecer-password-content";

export default function RestablecerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense>
      <RestablecerPasswordContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
