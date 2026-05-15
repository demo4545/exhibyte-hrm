"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  formToSheetRow,
  initialEmployeeForm,
  sheetRowToForm,
  type EmployeeFormState,
} from "@/lib/employeeForm";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { STATUS } from "@/app/consts/common";

function FormField({
  label,
  id,
  children,
  className,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export type EmployeeFormProps = {
  mode: "add" | "edit";
  sheetRow?: number;
};

export function EmployeeForm({ mode, sheetRow }: EmployeeFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<EmployeeFormState>(initialEmployeeForm);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [headersLoading, setHeadersLoading] = useState(!isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadForm();
  }, [mode, sheetRow]);

  const loadForm = async () => {
    try {
      if (isEdit) {
        setLoading(true);
      } else {
        setHeadersLoading(true);
      }
      setError(null);

      if (isEdit && sheetRow) {
        const response = await fetch(`/api/employee?row=${sheetRow}`);
        const result = await response.json();

        if (!result.success) {
          setError(result.message || "Employee not found");
          return;
        }

        const headers = (result.headers as string[]) ?? [];
        setSheetHeaders(headers);
        setForm(sheetRowToForm(headers, (result.row as string[]) ?? []));
        return;
      }

      const response = await fetch("/api/employee?headersOnly=true");
      const result = await response.json();

      if (result.success) {
        const headers = (result.headers as string[]) ?? [];
        if (headers.length === 0) {
          setError("No columns found in the employee sheet.");
        } else {
          setSheetHeaders(headers);
        }
      } else {
        setError(result.message || "Failed to load sheet columns");
      }
    } catch {
      setError(
        isEdit ? "Failed to load employee" : "Failed to load sheet columns",
      );
    } finally {
      setLoading(false);
      setHeadersLoading(false);
    }
  };

  const update =
    (field: keyof EmployeeFormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      };

  const handleFile =
    (field: "pancard" | "aadharCard" | "marksheet") =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setForm((prev) => ({
          ...prev,
          [field]: file?.name ?? prev[field],
        }));
      };

  const saveEmployee = async (formData: EmployeeFormState) => {
    if (!sheetHeaders.length) {
      setError("Sheet columns are not loaded yet.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const rowValues = formToSheetRow(formData, sheetHeaders);

    try {
      const response = await fetch("/api/employee", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { sheetRow, values: [rowValues] }
            : { values: [rowValues] },
        ),
      });
      const result = await response.json();

      if (result.success) {
        router.push("/employee");
        return;
      }

      setError(
        result.message ||
        (isEdit ? "Failed to update employee" : "Failed to add employee"),
      );
    } catch {
      setError(
        isEdit
          ? "Failed to update employee. Please try again."
          : "Failed to add employee. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEmployee(form);
  };

  const handleStatusChange = async () => {
    const nextStatus =
      form.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
    const updatedForm = { ...form, status: nextStatus };
    setForm(updatedForm);
    await saveEmployee(updatedForm);
  };

  if (loading) {
    return <p className="text-sm text-ex-muted">Loading employee…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" id="name">
            <Input
              id="name"
              value={form.name}
              onChange={update("name")}
              placeholder="Full legal name"
              required
            />
          </FormField>

          <FormField label="Role" id="role">
            <Input
              id="role"
              value={form.role}
              onChange={update("role")}
              placeholder="e.g. Software Engineer"
              required
            />
          </FormField>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={update("address")}
              placeholder="Residential address"
              rows={3}
            />
          </div>

          <FormField label="Birthday date" id="birthdayDate">
            <Input
              id="birthdayDate"
              type="date"
              value={form.birthdayDate}
              onChange={update("birthdayDate")}
            />
          </FormField>

          <FormField label="Joining date" id="joiningDate">
            <Input
              id="joiningDate"
              type="date"
              value={form.joiningDate}
              onChange={update("joiningDate")}
            />
          </FormField>

          <FormField label="Last increment date" id="lastIncrementDate">
            <Input
              id="lastIncrementDate"
              type="date"
              value={form.lastIncrementDate}
              onChange={update("lastIncrementDate")}
            />
          </FormField>

          <FormField label="Experience" id="experience">
            <Input
              id="experience"
              value={form.experience}
              onChange={update("experience")}
              placeholder="Years of experience"
              required
            />
          </FormField>

          <FormField label="Tech skills" id="techSkills" className="sm:col-span-2">
            <Input
              id="techSkills"
              value={form.techSkills}
              onChange={update("techSkills")}
              placeholder="e.g. React, Node.js, PostgreSQL"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Pancard" id="pancard">
            <Input
              id="pancard"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFile("pancard")}
            />
            {form.pancard ? (
              <p className="text-xs text-ex-muted">{form.pancard}</p>
            ) : null}
          </FormField>

          <FormField label="Aadhar card" id="aadharCard">
            <Input
              id="aadharCard"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFile("aadharCard")}
            />
            {form.aadharCard ? (
              <p className="text-xs text-ex-muted">{form.aadharCard}</p>
            ) : null}
          </FormField>

          <FormField label="Marksheet" id="marksheet" className="sm:col-span-2">
            <Input
              id="marksheet"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFile("marksheet")}
            />
            {form.marksheet ? (
              <p className="text-xs text-ex-muted">{form.marksheet}</p>
            ) : null}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parent / guardian information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="parentGuardian"
            value={form.parentGuardian}
            onChange={update("parentGuardian")}
            placeholder="Name, relationship, contact number, address…"
            rows={4}
          />
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={submitting || headersLoading || !sheetHeaders.length}
        >
          {submitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Add employee"}

        </Button>

        {
          isEdit && <Button onClick={handleStatusChange} variant={form.status === STATUS.ACTIVE ? "danger" : "primary"}>
            {form.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE}
            {form.status === STATUS.ACTIVE ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
        }

        <Link href="/employee">
          <Button type="button" variant="ghost" disabled={submitting}>
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
