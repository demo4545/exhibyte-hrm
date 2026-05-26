"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/ui/page-header";
import { AccessDenied } from "@/components/ui/access-denied";
import { FormSkeleton } from "@/components/ui/form-skeleton";
import { EmployeeProfileView } from "@/components/employee/employee-profile-view";
import { useAuth } from "@/contexts/auth-provider";
import { isAccountInactiveRedirectError } from "@/lib/account-inactive-client";
import { sheetRowToForm, type EmployeeFormState } from "@/lib/employee";

export default function EmployeeProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<EmployeeFormState | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/employee/me");
        const result = await response.json();

        if (!result.success) {
          setError(result.message ?? "Failed to load your profile.");
          return;
        }

        const headers = (result.headers as string[]) ?? [];
        setForm(sheetRowToForm(headers, (result.row as string[]) ?? []));
        setHasPassword(Boolean(result.hasPassword));
      } catch (error) {
        if (isAccountInactiveRedirectError(error)) return;
        setError("Failed to load your profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Employee profile"
          description="Your basic employment details."
        />
        <FormSkeleton label="Loading profile…" fields={8} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !form) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Employee profile"
          description="Your basic employment details."
        />
        <AccessDenied
          title="Profile unavailable"
          description={
            error ??
            "We could not find an employee record for your login. Contact HR if this is unexpected."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Employee profile"
        description="View your details and manage your sign-in username and password."
      />
      <EmployeeProfileView
        form={form}
        showAccountSettings
        hasPassword={hasPassword}
      />
    </div>
  );
}
