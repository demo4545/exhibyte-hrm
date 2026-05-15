import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";

export type SortOrder = "asc" | "desc";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  sortable?: boolean;
  /** Pin column while scrolling horizontally */
  sticky?: "left" | "right";
  render?: (row: T) => React.ReactNode;
};

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
}: {
  columns: Column<T>[];
  rows: T[];
  className?: string;
  loading?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
}) {
  if (loading) {
    return <TableSkeleton />;
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
                const sortable = c.sortable !== false && !!onSort && c.key !== "actions";

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
