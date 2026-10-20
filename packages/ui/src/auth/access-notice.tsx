import * as React from "react"

export interface AccessNoticeProps {
  title: string
  description: string
  /** Actions such as a reload link or a logout button. */
  children?: React.ReactNode
}

/** Full-page notice for session problems (unavailable, no permissions). */
export function AccessNotice({ title, description, children }: AccessNoticeProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-card p-8 text-center shadow-2xl ring-1 ring-foreground/10">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children ? (
          <div className="flex items-center justify-center gap-3">{children}</div>
        ) : null}
      </div>
    </div>
  )
}
