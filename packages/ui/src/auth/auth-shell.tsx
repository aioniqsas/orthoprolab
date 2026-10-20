import * as React from "react"
import { Check } from "lucide-react"

export interface AuthShellProps {
  /** Product name shown in the header, e.g. "Portal de clientes". */
  productName: string
  eyebrow?: string
  heading: string
  description?: string
  /** Short factual bullets for the brand column. Keep them free of invented claims. */
  highlights?: string[]
  /** The form card content. */
  children: React.ReactNode
  /** Links rendered below the card (e.g. a link to the other auth screen). */
  footer?: React.ReactNode
}

export function AuthShell({
  productName,
  eyebrow,
  heading,
  description,
  highlights,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,color-mix(in_oklab,var(--color-title)_22%,transparent),transparent)]"
      />
      <header className="relative border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-12">
          <span className="font-heading text-lg font-semibold tracking-tight">
            OrthoPro <span className="text-primary">Lab</span>
          </span>
          <span className="text-sm text-muted-foreground">{productName}</span>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 lg:px-12">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <section className="flex flex-col gap-5 lg:col-span-7">
            {eyebrow ? (
              <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-title uppercase">
                <span aria-hidden className="size-2 rounded-full bg-primary" />
                {eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-xl font-heading text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
              {heading}
            </h1>
            {description ? (
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
            {highlights && highlights.length > 0 ? (
              <ul className="mt-2 flex max-w-lg flex-col gap-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="relative overflow-hidden rounded-xl bg-card p-6 shadow-2xl ring-1 ring-foreground/10 sm:p-8">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-secondary via-primary to-secondary"
              />
              {children}
            </div>
            {footer ? (
              <div className="text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="relative border-t border-border">
        <div className="mx-auto w-full max-w-7xl px-6 py-4 text-xs text-muted-foreground lg:px-12">
          OrthoPro Lab
        </div>
      </footer>
    </div>
  )
}
