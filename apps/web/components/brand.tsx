export function Brand({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading font-bold tracking-tight text-body ${className}`}
    >
      Ortho<span className="text-highlight">Pro</span> Lab
    </span>
  );
}
