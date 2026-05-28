"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { CorrectionForm } from "@/components/attendance/correction-form";
import { EarlyLeaveDialog } from "@/components/attendance/early-leave-dialog";
import { PunchDesk } from "@/components/attendance/punch-desk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayAttendance } from "@/hooks/use-today-attendance";
import { useAuth } from "@/contexts/auth-provider";
import { canManageEmployees } from "@/lib/auth/roles";
import {
  fetchCorrectionRequests,
  reviewCorrection,
  type CorrectionRequestDto,
} from "@/lib/attendance/client";
import { CORRECTION_STATUS } from "@/lib/attendance/constants";
import { idealWorkingMs } from "@/lib/attendance/time";

export default function PunchPage() {
  const { user } = useAuth();
  const isHr = user ? canManageEmployees(user.role) : false;
  const { today, loading, error, acting, liveWorkedMs, runAction, refresh } =
    useTodayAttendance();
  const [showCorrection, setShowCorrection] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionRequestDto[]>([]);
  const [reviewing, setReviewing] = useState<{
    id: string;
    status: "Approved" | "Rejected";
  } | null>(null);
  const [earlyLeaveOpen, setEarlyLeaveOpen] = useState(false);
  const [earlyLeaveError, setEarlyLeaveError] = useState<string | null>(null);

  const shortfallMs = Math.max(0, idealWorkingMs() - liveWorkedMs);
  const isLeavingEarly = Boolean(today?.hasPunchedIn && !today?.hasPunchedOut && shortfallMs > 0);

  async function handlePunchOut() {
    if (isLeavingEarly) {
      setEarlyLeaveError(null);
      setEarlyLeaveOpen(true);
      return;
    }
    await runAction("punch-out");
  }

  async function confirmEarlyLeave(reason: string) {
    setEarlyLeaveError(null);
    try {
      await runAction("punch-out", { earlyLeaveReason: reason });
      setEarlyLeaveOpen(false);
    } catch (err) {
      setEarlyLeaveError(err instanceof Error ? err.message : "Punch out failed");
    }
  }

  useEffect(() => {
    if (!isHr) return;
    void fetchCorrectionRequests().then(setCorrections).catch(() => {});
  }, [isHr]);

  async function handleReview(id: string, status: "Approved" | "Rejected") {
    setReviewing({ id, status });
    try {
      await reviewCorrection(id, status);
      setCorrections(await fetchCorrectionRequests());
      await refresh();
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ex-primary">Punch desk</h1>
        <p className="text-sm text-ex-muted">
          Your daily check-in — one tap to start, one tap to finish.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <PunchDesk
        userName={user?.name}
        today={today}
        loading={loading}
        acting={acting}
        liveWorkedMs={liveWorkedMs}
        onPunchIn={() => void runAction("punch-in")}
        onPunchOut={() => void handlePunchOut()}
        onBreakStart={() => void runAction("break-start")}
        onBreakEnd={() => void runAction("break-end")}
        onRequestCorrection={
          today?.hasPunchedIn ? () => setShowCorrection((v) => !v) : undefined
        }
      />

      <EarlyLeaveDialog
        open={earlyLeaveOpen}
        shortfallMs={shortfallMs}
        submitting={acting}
        error={earlyLeaveError}
        onConfirm={(reason) => void confirmEarlyLeave(reason)}
        onCancel={() => {
          if (!acting) {
            setEarlyLeaveOpen(false);
            setEarlyLeaveError(null);
          }
        }}
      />

      {showCorrection && today?.hasPunchedIn ? (
        <CorrectionForm
          date={today.date}
          onSuccess={() => setShowCorrection(false)}
          onCancel={() => setShowCorrection(false)}
        />
      ) : null}

      {isHr && corrections.some((c) => c.status === CORRECTION_STATUS.PENDING) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending correction requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {corrections
              .filter((c) => c.status === CORRECTION_STATUS.PENDING)
              .map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 rounded-xl border border-ex-border bg-ex-surface/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm">
                    <p className="font-medium text-ex-primary">
                      {c.employeeName} · {c.date} · {c.field}
                    </p>
                    <p className="text-ex-muted">
                      {c.originalValue || "—"} → {c.requestedValue}
                    </p>
                    <p className="mt-1 text-ex-muted">{c.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={reviewing !== null}
                      onClick={() => void handleReview(c.id, "Approved")}
                    >
                      {reviewing?.id === c.id && reviewing.status === "Approved" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Approving…
                        </>
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewing !== null}
                      onClick={() => void handleReview(c.id, "Rejected")}
                    >
                      {reviewing?.id === c.id && reviewing.status === "Rejected" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Rejecting…
                        </>
                      ) : (
                        "Reject"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
