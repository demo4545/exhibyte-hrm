"use client";

import {
  CalendarDays,
  Download,
  Loader2,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { IDEAL_WORKING_HOURS } from "@/lib/attendance/constants";
import type { AttendanceHistoryRow, AttendancePeriod } from "@/lib/attendance/client";
import type { Employee } from "@/types/employee";
import type { SortOrder } from "@/types/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

type StatusFilter = "all" | "Completed" | "Short Hours" | "Overtime";

function statusBadgeVariant(status: string) {
  if (status === "Completed" || status === "Overtime") return "success" as const;
  if (status === "Short Hours") return "warning" as const;
  return "default" as const;
}

function formatTableDate(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatOvertimeCell(row: AttendanceHistoryRow) {
  const value = (row.overtime ?? "").trim();
  if (!value || value === "—") return <span className="text-ex-muted">—</span>;
  if (value.startsWith("-")) {
    return (
      <span className="font-medium text-amber-700 dark:text-amber-400">
        Early · {value.slice(1)}
      </span>
    );
  }
  return <span className="font-medium text-emerald-700 dark:text-emerald-400">{value}</span>;
}

function computeSummary(rows: AttendanceHistoryRow[]) {
  let completed = 0;
  let short = 0;
  let overtime = 0;

  for (const row of rows) {
    if (row.status === "Completed") completed++;
    else if (row.status === "Short Hours") short++;
    else if (row.status === "Overtime") overtime++;
  }

  return { total: rows.length, completed, short, overtime };
}

export function AttendanceHistoryView({
  isHr,
  employees,
  selectedSheetRow,
  onEmployeeChange,
  periods,
  year,
  month,
  onYearChange,
  onMonthChange,
  rows,
  loading,
  importing,
  error,
  importMessage,
  onImportClick,
  onExport,
  canExport,
}: {
  isHr: boolean;
  employees: Employee[];
  selectedSheetRow: number | null;
  onEmployeeChange: (sheetRow: number) => void;
  periods: AttendancePeriod[];
  year: number | null;
  month: number | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  rows: AttendanceHistoryRow[];
  loading: boolean;
  importing: boolean;
  error: string | null;
  importMessage: string | null;
  onImportClick: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const availableMonths = useMemo(
    () => periods.find((p) => p.year === year)?.months ?? [],
    [periods, year],
  );

  const monthLabel = availableMonths.find((m) => m.month === month)?.label ?? "";

  const filteredRows = useMemo(() => {
    let list = [...rows];
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    list.sort((a, b) => {
      const av = String((a as Record<string, string>)[sortBy] ?? "");
      const bv = String((b as Record<string, string>)[sortBy] ?? "");
      const cmp = av.localeCompare(bv);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [rows, statusFilter, sortBy, sortOrder]);

  const summary = useMemo(() => computeSummary(rows), [rows]);

  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const selectedEmployee = employees.find((e) => Number(e.sheetRow) === selectedSheetRow);

  const statusFilters: { id: StatusFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "Completed", label: "Completed", count: summary.completed },
    { id: "Short Hours", label: "Short", count: summary.short },
    { id: "Overtime", label: "Overtime", count: summary.overtime },
  ];

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  }

  const tableEmpty =
    !loading &&
    filteredRows.length === 0 &&
    (rows.length === 0 || statusFilter !== "all");

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-ex-border bg-gradient-to-br from-teal-500/10 via-ex-elevated to-ex-elevated p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-ex-muted">
              <CalendarDays className="size-4" aria-hidden />
              <span className="text-sm font-medium">Attendance history</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ex-primary sm:text-3xl">
              {monthLabel && year != null ? `${monthLabel} ${year}` : "Your attendance"}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-ex-muted">
              {isHr
                ? "Review punch times, work hours, and early leave notes. Import legacy CSV when needed."
                : `Monthly log of punch in/out, break, and ${IDEAL_WORKING_HOURS}h work target.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isHr ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-ex-elevated/80"
                disabled={importing || selectedSheetRow == null}
                onClick={onImportClick}
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Import CSV
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-ex-elevated/80"
              disabled={!canExport}
              onClick={onExport}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-ex-border/60 pt-5 sm:flex-row sm:flex-wrap sm:items-end">
          {isHr ? (
            <div className="min-w-[200px] flex-1 sm:max-w-xs">
              <label className="mb-1 block text-xs font-medium text-ex-muted">Employee</label>
              <Select
                value={selectedSheetRow ?? ""}
                onChange={(e) => {
                  onEmployeeChange(parseInt(e.target.value, 10));
                  setPage(1);
                }}
              >
                {employees.map((emp) => (
                  <option key={emp.sheetRow} value={emp.sheetRow}>
                    {emp.name}
                    {emp.employeeId ? ` · ${emp.employeeId}` : ""}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[120px]">
              <label className="mb-1 block text-xs font-medium text-ex-muted">Year</label>
              <Select
                value={year ?? ""}
                onChange={(e) => {
                  onYearChange(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                disabled={!periods.length}
              >
                {periods.map((p) => (
                  <option key={p.year} value={p.year}>
                    {p.year}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-[120px]">
              <label className="mb-1 block text-xs font-medium text-ex-muted">Month</label>
              <Select
                value={month ?? ""}
                onChange={(e) => {
                  onMonthChange(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                disabled={!availableMonths.length}
              >
                {availableMonths.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {selectedEmployee && isHr ? (
          <p className="mt-2 text-xs text-ex-muted">
            Viewing{" "}
            <span className="font-medium text-ex-primary">{selectedEmployee.name}</span>
          </p>
        ) : null}
      </div>

      {importMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {importMessage}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Days logged" value={String(summary.total)} hint="This month" />
          <StatCard
            label="Completed"
            value={String(summary.completed)}
            hint={`${IDEAL_WORKING_HOURS}h target met`}
          />
          <StatCard label="Short hours" value={String(summary.short)} hint="Left early" />
          <StatCard label="Overtime days" value={String(summary.overtime)} hint="Above target" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setStatusFilter(f.id);
              setPage(1);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition",
              statusFilter === f.id
                ? "border-ex-secondary bg-ex-secondary/15 text-ex-primary"
                : "border-ex-border bg-ex-elevated text-ex-muted hover:border-ex-secondary/30 hover:text-ex-primary",
            )}
          >
            {f.id === "Short Hours" ? (
              <TrendingDown className="size-3.5" aria-hidden />
            ) : f.id === "Overtime" ? (
              <TrendingUp className="size-3.5" aria-hidden />
            ) : null}
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                statusFilter === f.id ? "bg-ex-secondary/20" : "bg-ex-surface",
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <DataTable
          loading={loading}
          rows={tableEmpty ? [] : paginatedRows}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          className="rounded-2xl"
          emptyTitle="No attendance records"
          emptyDescription={
            rows.length === 0
              ? isHr
                ? "Import a legacy CSV (Date, Work Mode, In Time, Out Time) or choose another month."
                : "Punch in to build your history, or select a month with data."
              : "No rows match this filter."
          }
          emptyAction={
            isHr && rows.length === 0 ? (
              <Button variant="outline" className="gap-2" onClick={onImportClick}>
                <Upload className="size-4" />
                Import CSV
              </Button>
            ) : undefined
          }
          columns={[
            {
              key: "date",
              header: "Date",
              sortable: true,
              render: (r) => (
                <span className="font-medium">{formatTableDate(r.date)}</span>
              ),
            },
            {
              key: "punchIn",
              header: "In",
              sortable: true,
              className: "tabular-nums",
            },
            {
              key: "punchOut",
              header: "Out",
              sortable: true,
              className: "tabular-nums",
            },
            {
              key: "breakTime",
              header: "Break",
              sortable: true,
              className: "tabular-nums",
            },
            {
              key: "workingHours",
              header: "Work",
              sortable: true,
              className: "tabular-nums font-medium",
            },
            {
              key: "overtime",
              header: "Extra / short",
              sortable: true,
              render: (r) => formatOvertimeCell(r),
            },
            {
              key: "status",
              header: "Status",
              sortable: true,
              render: (r) => (
                <Badge variant={statusBadgeVariant(r.status)}>{r.status || "—"}</Badge>
              ),
            },
            {
              key: "earlyLeaveReason",
              header: "Early leave reason",
              sortable: false,
              className: "max-w-[220px] whitespace-normal",
              render: (r) =>
                r.earlyLeaveReason?.trim() ? (
                  <span className="line-clamp-2 text-sm text-ex-muted" title={r.earlyLeaveReason}>
                    {r.earlyLeaveReason}
                  </span>
                ) : (
                  <span className="text-ex-muted">—</span>
                ),
            },
          ]}
        />

        {!loading && filteredRows.length > PAGE_SIZE ? (
          <Pagination
            pagination={{
              page,
              totalPages,
              total: filteredRows.length,
              pageSize: PAGE_SIZE,
            }}
            onPageChange={setPage}
          />
        ) : null}
      </div>
    </div>
  );
}
