"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Column, DataTable, type SortOrder } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-provider";
import { headerToKey } from "@/lib/sheetSort";
import {
  DEFAULT_PAGE_SIZE,
  type SheetPagination,
} from "@/lib/sheetPagination";
import { Input } from "@/components/ui/input";
import { STATUS } from "@/app/consts/common";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type EmployeeRow = { id: string } & Record<string, string>;

const emptyPagination: SheetPagination = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export default function EmployeeDirectoryPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column<EmployeeRow>[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState<SheetPagination>(emptyPagination);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        sortBy,
        order: sortOrder,
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      const response = await fetch(`/api/employee?${params}`);
      const result = await response.json();

      if (result.success) {
        const sheetData = result.data || [];
        const headers = (sheetData[0] as string[]) ?? [];
        const keys = headers.map(headerToKey);

        const tableColumns = headers.map((header, i) => ({
          key: keys[i],
          header,
          ...(keys[i] === "status" && {
            render: (r: EmployeeRow) => (
              <>
                <Badge variant={r.status === STATUS.ACTIVE ? "success" : "danger"}>{r.status}</Badge>
              </>
            ),
          }),
        }));

        const dataRows = sheetData.slice(1);
        const pageInfo: SheetPagination = result.pagination ?? emptyPagination;
        const sheetRows: number[] = result.sheetRows ?? [];

        const canManage =
          user?.role === "hr" || user?.role === "super_admin";

        const formattedData = dataRows.map((row: string[], index: number) => {
          const record: Record<string, string> = {
            id: String(sheetRows[index] ?? index + 1),
          };

          keys.forEach((key, colIndex) => {
            record[key] = row[colIndex] ?? "";
          });

          return record as EmployeeRow;
        });

        const columnsWithActions = canManage
          ? [
            ...tableColumns,
            {
              key: "actions",
              header: "",
              sortable: false,
              sticky: "right",
              className: "min-w-[5.5rem]",
              render: (r: EmployeeRow) => (
                <Link href={`/employee/${r.id}/edit`}>
                  <Button variant="ghost" size="sm" type="button">
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                </Link>
              ),
            },
          ]
          : tableColumns;

        setColumns(columnsWithActions as Column<EmployeeRow>[]);
        setRows(formattedData);
        setPagination(pageInfo);
      }
    } catch (error) {
      console.error("Fetch Employee Error:", error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, page, debouncedSearch, statusFilter, user?.role]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  const handleSort = (key: string) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="All Employees"
        description="View and manage all employees in the organization."
        actions={
          (user?.role === "hr" ||
            user?.role === "super_admin") && (
            <Link href="/employee/new">
              <Button variant="secondary" size="sm">
                <Plus className="size-4" />
                Add employee
              </Button>
            </Link>
          )
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ex-muted" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or tech skills…"
              className="pl-9"
              aria-label="Search employees"
            />
          </div>

          <div className="w-full space-y-2 sm:w-44">
            <Select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value={STATUS.ACTIVE}>{STATUS.ACTIVE}</option>
              <option value={STATUS.INACTIVE}>{STATUS.INACTIVE}</option>
            </Select>
          </div>
        </div>

        <DataTable
          loading={loading}
          rows={rows}
          columns={columns}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
        />

        {!loading && (
          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        )}
      </div>
    </div>
  );
}
