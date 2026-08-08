"use client";

import { useEffect, useState } from "react";

type Teacher = { id: string; name: string; payRate: number };

type PayrollSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionNumber: number | null;
  room: { name: string };
  enrollment: {
    student: { name: string };
    courseType: { name: string };
  };
};

type OwnerPayment = {
  id: string;
  amount: number;
  paidAt: string;
  memo: string | null;
  enrollment: {
    student: { name: string };
    courseType: { name: string };
  };
};

type StaffPayrollData = {
  mode: "staff";
  teacher: Teacher;
  month: string;
  sessions: PayrollSession[];
  totalSessions: number;
  totalPay: number;
};

type OwnerPayrollData = {
  mode: "owner";
  teacher: Teacher;
  month: string;
  revenue: number;
  payments: OwnerPayment[];
  totalSessions: number;
  estimatedWorkValue: number;
};

type PayrollData = StaffPayrollData | OwnerPayrollData;

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function PayrollPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(false);

  const [rateInput, setRateInput] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => r.json())
      .then((list: Teacher[]) => {
        setTeachers(list);
        if (list.length > 0) setTeacherId((prev) => prev || list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!teacherId || !month) return;
    setLoading(true);
    fetch(`/api/payroll?teacherId=${teacherId}&month=${month}`)
      .then((r) => r.json())
      .then((d: PayrollData) => {
        setData(d);
        setRateInput(String(d.teacher.payRate));
      })
      .finally(() => setLoading(false));
  }, [teacherId, month]);

  async function saveRate() {
    if (!teacherId) return;
    setSavingRate(true);
    try {
      await fetch(`/api/teachers/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payRate: Number(rateInput) || 0 }),
      });
      const res = await fetch(`/api/payroll?teacherId=${teacherId}&month=${month}`);
      setData(await res.json());
    } finally {
      setSavingRate(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">강의료 정산</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.mode === "owner"
            ? "원장은 실제 입금(매출) 기준으로 집계합니다."
            : "강사와 월을 선택하면 해당 월에 진행된(취소 제외) 수업 회차수와 정산 금액을 계산합니다."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">강사</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">월</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        {data?.mode !== "owner" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">회차당 단가 (원)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={saveRate}
                disabled={savingRate}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">불러오는 중...</p>}

      {!loading && data?.mode === "owner" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600">이번 달 매출 (입금 기준)</p>
              <p className="mt-1 text-xl font-semibold text-blue-700">
                {formatKRW(data.revenue)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">진행한 수업 회차</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {data.totalSessions}회
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">회차 기준 환산 수업료</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatKRW(data.estimatedWorkValue)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">이번 달 입금 내역</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">입금일</th>
                  <th className="px-4 py-3">학생</th>
                  <th className="px-4 py-3">과정</th>
                  <th className="px-4 py-3">금액</th>
                  <th className="px-4 py-3">메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      해당 월에 입금 내역이 없습니다.
                    </td>
                  </tr>
                )}
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">{p.paidAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {p.enrollment.student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.enrollment.courseType.name}</td>
                    <td className="px-4 py-3 text-slate-600">{formatKRW(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-400">{p.memo ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && data?.mode === "staff" && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">총 진행 회차수</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {data.totalSessions}회
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">회차당 단가</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {formatKRW(data.teacher.payRate)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-600">총 정산 금액</p>
              <p className="mt-1 text-xl font-semibold text-blue-700">
                {formatKRW(data.totalPay)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3">시간</th>
                  <th className="px-4 py-3">학생</th>
                  <th className="px-4 py-3">과정</th>
                  <th className="px-4 py-3">회차</th>
                  <th className="px-4 py-3">강의실</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.sessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      해당 월에 진행된 수업이 없습니다.
                    </td>
                  </tr>
                )}
                {data.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">{s.date.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.startTime}-{s.endTime}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.enrollment.student.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.enrollment.courseType.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.sessionNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.room.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
