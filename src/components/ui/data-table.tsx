import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import type { Column, SortOrder } from "@/types/table";

function TableEmptyState({
  title = "No data found",
  description = "There are no records to display at the moment.",
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
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ex-border bg-ex-elevated px-6 py-16 text-center shadow-sm dark:shadow-none",
        className,
      )}
    >
      <div
        className="mb-4 flex size-14 items-center justify-center rounded-full bg-ex-surface ring-1 ring-ex-border"
        aria-hidden
      >
        <Inbox className="size-6 text-ex-muted" />
      </div>
      <h3 className="text-sm font-semibold text-ex-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ex-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

const stickyColumnClasses = {
  right: {
    header:
      "sticky right-0 z-20 bg-ex-surface shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.12)] dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.35)]",
    cell: "sticky right-0 z-10 bg-ex-elevated shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.12)] group-hover:bg-ex-surface/80 dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.35)]",
  },
  left: {
    header:
      "sticky left-0 z-20 bg-ex-surface shadow-[6px_0_12px_-6px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_12px_-6px_rgba(0,0,0,0.35)]",
    cell: "sticky left-0 z-10 bg-ex-elevated shadow-[6px_0_12px_-6px_rgba(0,0,0,0.12)] group-hover:bg-ex-surface/80 dark:shadow-[6px_0_12px_-6px_rgba(0,0,0,0.35)]",
  },
} as const;

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  className,
  loading,
  sortBy,
  sortOrder = "asc",
  onSort,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  columns: Column<T>[];
  rows: T[];
  className?: string;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  if (loading) {
    return <TableSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <TableEmptyState
        className={className}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-ex-border bg-ex-elevated shadow-sm dark:shadow-none",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ex-surface text-xs uppercase tracking-wide text-ex-muted">
            <tr>
              {columns.map((c) => {
                const key = String(c.key);
                const isActive = sortBy === key;
                const sortable = c.sortable !== false && !!onSort;

                return (
                  <th
                    key={key}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 font-medium",
                      c.sticky && stickyColumnClasses[c.sticky].header,
                      c.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition hover:text-ex-primary",
                          isActive && "text-ex-primary",
                        )}
                      >
                        {c.header}
                        {isActive ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-ex-border">
            {rows.map((row) => (
              <tr key={row.id} className="group hover:bg-ex-surface/80">
                {columns.map((c) => {
                  const value = c.render
                    ? null
                    : String((row as Record<string, unknown>)[c.key as string] ?? "");
                  return (
                    <td
                      key={String(c.key)}
                      title={value ?? undefined}
                      className={cn(
                        "whitespace-nowrap px-4 py-3 text-ex-primary",
                        c.sticky && stickyColumnClasses[c.sticky].cell,
                        c.className,
                      )}
                    >
                      {c.render ? c.render(row) : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
