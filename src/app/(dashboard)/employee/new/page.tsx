"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/employee/employee-form";
import { useAuth } from "@/contexts/auth-provider";

export default function AddEmployeePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const canManage =
    user?.role === "hr" || user?.role === "super_admin";

  useEffect(() => {
    if (authLoading) return;
    if (!canManage) router.replace("/employee");
  }, [authLoading, canManage, router]);

  if (authLoading || !canManage) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Add employee"
        description="Enter employee details to create a new record."
        actions={
          <Link href="/employee">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" />
              Back to directory
            </Button>
          </Link>
        }
      />

      <EmployeeForm mode="add" />
    </div>
  );
}
