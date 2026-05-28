"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WorkTimer } from "@/components/attendance/work-timer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchTodayAttendance, type TodayAttendance } from "@/lib/attendance/client";
import {
  IDEAL_BREAK_HOURS,
  IDEAL_SHIFT_HOURS,
  IDEAL_WORKING_HOURS,
} from "@/lib/attendance/constants";
import { computeLiveWorkedMsFromFields, formatDuration } from "@/lib/attendance/time";

export function AttendanceWidget() {
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void fetchTodayAttendance()
      .then(setToday)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!today?.hasPunchedIn || today.hasPunchedOut) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [today?.hasPunchedIn, today?.hasPunchedOut]);

  const workedMs = today
    ? computeLiveWorkedMsFromFields({
        date: today.date,
        punchIn: today.punchIn,
        punchOut: today.punchOut,
        totalBreakTime: today.totalBreakTime,
        breakStart: today.breakStart,
        breakEnd: today.breakEnd,
      })
    : 0;

  const remainingMs = Math.max(0, IDEAL_WORKING_HOURS * 60 * 60 * 1000 - workedMs);
  void tick;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Today&apos;s attendance</CardTitle>
        <Link href="/employee/punch">
          <Button variant="outline" size="sm" type="button">
            Punch
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-ex-muted">Loading attendance…</p>
        ) : !today?.hasPunchedIn ? (
          <p className="text-sm text-ex-muted">Not punched in yet today.</p>
        ) : (
          <>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ex-muted">Punch In</dt>
                <dd className="font-medium text-ex-primary">{today.punchIn || "—"}</dd>
              </div>
              <div>
                <dt className="text-ex-muted">Current Break</dt>
                <dd className="font-medium text-ex-primary">
                  {today.onBreak ? "Yes" : "No"}
                </dd>
              </div>
              <div>
                <dt className="text-ex-muted">Work goal</dt>
                <dd className="font-medium text-ex-primary">
                  {IDEAL_WORKING_HOURS}h work + {IDEAL_BREAK_HOURS}h break
                </dd>
              </div>
              <div>
                <dt className="text-ex-muted">Work left</dt>
                <dd className="font-medium text-ex-primary">
                  {today.hasPunchedOut ? "—" : formatDuration(remainingMs)}
                </dd>
              </div>
              <div>
                <dt className="text-ex-muted">Break used</dt>
                <dd className="font-medium text-ex-primary">
                  {today.breakAllowanceFormatted ??
                    `0h / ${IDEAL_BREAK_HOURS}h`}
                </dd>
              </div>
              <div>
                <dt className="text-ex-muted">Typical day</dt>
                <dd className="font-medium text-ex-primary">{IDEAL_SHIFT_HOURS}h total</dd>
              </div>
            </dl>
            <WorkTimer workedMs={workedMs} />
            {today.status ? (
              <p className="text-xs text-ex-muted">Status: {today.status}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
