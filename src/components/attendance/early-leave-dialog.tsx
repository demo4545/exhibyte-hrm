"use client";

import { Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EARLY_LEAVE_REASON_MIN_LENGTH, IDEAL_WORKING_HOURS } from "@/lib/attendance/constants";
import { formatDuration } from "@/lib/attendance/time";

const QUICK_REASONS = [
  "Personal appointment",
  "Not feeling well",
  "Family emergency",
  "Approved early leave",
] as const;

export function EarlyLeaveDialog({
  open,
  shortfallMs,
  submitting,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  shortfallMs: number;
  submitting?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();
  const tooShort =
    trimmed.length > 0 && trimmed.length < EARLY_LEAVE_REASON_MIN_LENGTH;
  const canSubmit = trimmed.length >= EARLY_LEAVE_REASON_MIN_LENGTH && !submitting;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="early-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={submitting ? undefined : onCancel}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-ex-border bg-ex-elevated p-5 shadow-xl sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <LogOut className="size-5 text-amber-700 dark:text-amber-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="early-leave-title" className="text-lg font-semibold text-ex-primary">
              Leaving before {IDEAL_WORKING_HOURS}h?
            </h2>
            <p className="mt-1 text-sm text-ex-muted">
              You&apos;re about{" "}
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {formatDuration(shortfallMs)}
              </span>{" "}
              short of your daily work target. Please share why you&apos;re punching out early.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_REASONS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={submitting}
              className="rounded-full border border-amber-200/90 bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
              onClick={() => setReason(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="early-leave-reason">Reason for early punch-out</Label>
          <Textarea
            id="early-leave-reason"
            rows={3}
            required
            disabled={submitting}
            placeholder="e.g. doctor appointment, approved half-day…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="resize-none"
          />
          <p className="text-xs text-ex-muted">
            At least {EARLY_LEAVE_REASON_MIN_LENGTH} characters
            {tooShort ? (
              <span className="text-amber-700 dark:text-amber-400">
                {" "}
                ({EARLY_LEAVE_REASON_MIN_LENGTH - trimmed.length} more needed)
              </span>
            ) : null}
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={onCancel}
          >
            Stay clocked in
          </Button>
          <Button type="submit" disabled={!canSubmit} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Punching out…
              </>
            ) : (
              <>
                <LogOut className="size-4" aria-hidden />
                Confirm punch out
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
