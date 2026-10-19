import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h2",
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <span className="text-xs font-semibold uppercase tracking-widest text-title">
        {eyebrow}
      </span>
      <Tag className="text-3xl font-semibold tracking-tight text-body lg:text-4xl">
        {title}
      </Tag>
      {description ? (
        <p className="text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-highlight">{children}</span>;
}
