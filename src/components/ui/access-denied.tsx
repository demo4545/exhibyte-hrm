import type { ReactNode } from "react";
import { ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccessDenied({
  title = "You cannot access this page",
  description = "You do not have permission to view this content. Contact your administrator if you believe this is a mistake.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ex-border bg-ex-elevated px-6 py-16 text-center shadow-sm dark:shadow-none",
        className,
      )}
    >
      <div
        className="mb-4 flex size-14 items-center justify-center rounded-full bg-ex-surface ring-1 ring-ex-border"
        aria-hidden
      >
        <ShieldX className="size-6 text-ex-muted" />
      </div>
      <h3 className="text-sm font-semibold text-ex-primary">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ex-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
