"use client";

import { useState } from "react";
import EnrollmentPicker from "./EnrollmentPicker";

type Teacher = { id: string; name: string; color: string };
type Room = { id: string; name: string };
type EnrollmentOption = {
  id: string;
  totalSessions: number;
  student: { id: string; name: string };
  courseType: { id: string; name: string };
};

export type SessionModalData = {
  id?: string;
  enrollment: EnrollmentOption | null;
  teacherId: string;
  roomId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  sessionNumber: string;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELED";
};

export default function SessionModal({
  mode,
  initial,
  teachers,
  rooms,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  initial: SessionModalData;
  teachers: Teacher[];
  rooms: Room[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<SessionModalData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.enrollment) {
      setError("학생/과정을 선택해주세요.");
      return;
    }
    if (!form.teacherId || !form.roomId) {
      setError("강사와 강의실을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        enrollmentId: form.enrollment.id,
        teacherId: form.teacherId,
        roomId: form.roomId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        sessionNumber: form.sessionNumber ? Number(form.sessionNumber) : null,
      };
      const res = await fetch(
        mode === "create" ? "/api/sessions" : `/api/sessions/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSession() {
    if (!form.id) return;
    setSubmitting(true);
    try {
      await fetch(`/api/sessions/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!confirm("이 세션을 삭제하시겠습니까?")) return;
    setSubmitting(true);
    try {
      await fetch(`/api/sessions/${form.id}`, { method: "DELETE" });
      onDeleted?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          {mode === "create" ? "수업 등록" : "수업 수정"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              학생 / 과정
            </label>
            {mode === "create" ? (
              <EnrollmentPicker
                value={form.enrollment}
                onChange={(enrollment) => setForm((f) => ({ ...f, enrollment }))}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {form.enrollment?.student.name} · {form.enrollment?.courseType.name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">강사</label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">선택</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">강의실</label>
              <select
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">선택</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">시작</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">종료</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              회차 (선택)
            </label>
            <input
              type="number"
              min={1}
              value={form.sessionNumber}
              onChange={(e) => setForm((f) => ({ ...f, sessionNumber: e.target.value }))}
              className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              {mode === "edit" && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    disabled={submitting}
                    className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                  >
                    취소 처리
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
