import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@repo/ui/components/button"
import { ActionButton } from "@repo/ui/action-button";
import { Input } from "@repo/ui/components/input";

/** GET search form that keeps the other active filters as hidden fields. */
export function SearchForm({
  action,
  q,
  label,
  hidden = {},
}: {
  action: string;
  q: string;
  label: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" action={action} role="search" className="flex flex-wrap items-center gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="relative min-w-56 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          name="q"
          defaultValue={q}
          aria-label={label}
          placeholder={label}
          className="h-10 rounded-xl pl-8"
        />
      </div>
      <ActionButton type="submit" size="lg" className="h-10 rounded-xl px-4">
        Buscar
      </ActionButton>
      {q ? (
        <Link href={action} className="text-sm text-primary underline-offset-4 hover:underline">
          Limpiar búsqueda
        </Link>
      ) : null}
    </form>
  );
}
