import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M6 22 L16 8 L26 22"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="miter"
        className="text-accent"
      />
      <path
        d="M9 22 L16 12.5 L23 22"
        stroke="currentColor"
        strokeWidth="1.4"
        className="text-fg/70"
      />
      <path d="M12.5 22 L16 17 L19.5 22" stroke="currentColor" strokeWidth="1.3" className="text-muted" />
    </svg>
  );
}
