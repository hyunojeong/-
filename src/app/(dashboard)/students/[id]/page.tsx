"use client";

import { useEffect, useState, use as usePromise } from "react";

type CourseType = {
  id: string;
  name: string;
  defaultPrice: number;
  defaultSessions: number | null;
  isActive: boolean;
};

type Payment = {
  id: string;
  amount: number;
  paidAt: string;
  memo: string | null;
};

type Enrollment = {
  id: string;
  price: number;
  totalSessions: number;
  paidAmount: number;
  memo: string | null;
  courseType: { id: string; name: string };
  sessions: { id: string }[];
  payments: Payment[];
};

type StudentDetail = {
  id: string;
  name: string;
  phone: string | null;
  memo: string | null;
  enrollments: Enrollment[];
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);

  const [courseTypeId, setCourseTypeId] = useState("");
  const [price, setPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [totalSessions, setTotalSessions] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const [studentRes, courseTypesRes] = await Promise.all([
      fetch(`/api/students/${id}`),
      fetch(`/api/course-types`),
    ]);
    setStudent(await studentRes.json());
    setCourseTypes(await courseTypesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // course type 선택 시 기본 강의료 자동 입력 (직접 수정 전까지)
  useEffect(() => {
    const ct = courseTypes.find((c) => c.id === courseTypeId);
    if (ct && !priceTouched) {
      setPrice(String(ct.defaultPrice));
      setTotalSessions(ct.defaultSessions ? String(ct.defaultSessions) : "");
    }
  }, [courseTypeId, courseTypes, priceTouched]);

  async function handleAddEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!courseTypeId) {
      setError("과정을 선택해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: id,
          courseTypeId,
          price: Number(price),
          totalSessions: Number(totalSessions),
          paidAmount: Number(paidAmount || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setCourseTypeId("");
      setPrice("");
      setPriceTouched(false);
      setTotalSessions("");
      setPaidAmount("0");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function addPayment(enrollmentId: string, amount: number, paidAt: string, memo: string) {
    await fetch(`/api/enrollments/${enrollmentId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, paidAt, memo: memo || null }),
    });
    await load();
  }

  async function deletePayment(enrollmentId: string, paymentId: string) {
    await fetch(`/api/enrollments/${enrollmentId}/payments/${paymentId}`, { method: "DELETE" });
    await load();
  }

  if (loading || !student) {
    return <p className="text-sm text-slate-400">불러오는 중...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{student.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{student.phone ?? "연락처 미등록"}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">수강 과정 등록</h2>
        </div>
        <form onSubmit={handleAddEnrollment} className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">과정</label>
            <select
              value={courseTypeId}
              onChange={(e) => {
                setCourseTypeId(e.target.value);
                setPriceTouched(false);
              }}
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">선택</option>
              {courseTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              금액 (원) <span className="text-slate-400">- 자동입력, 수정 가능</span>
            </label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceTouched(true);
              }}
              required
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">총 회차수</label>
            <input
              type="number"
              min={1}
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              required
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">입금액</label>
            <input
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            등록
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">등록된 수강 과정</h2>
        {student.enrollments.length === 0 && (
          <p className="text-sm text-slate-400">등록된 수강 과정이 없습니다.</p>
        )}
        {student.enrollments.map((e) => {
          const remaining = e.price - e.paidAmount;
          return (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{e.courseType.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatKRW(e.price)} · 총 {e.totalSessions}회 · 등록된 세션{" "}
                    {e.sessions.length}건
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    입금 누적 {formatKRW(e.paidAmount)}
                  </span>
                  {e.price === 0 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      금액 미입력
                    </span>
                  ) : remaining <= 0 ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      완납
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      잔금 {formatKRW(remaining)}
                    </span>
                  )}
                </div>
              </div>

              <PaymentLedger
                payments={e.payments}
                onAdd={(amount, paidAt, memo) => addPayment(e.id, amount, paidAt, memo)}
                onDelete={(paymentId) => deletePayment(e.id, paymentId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function PaymentLedger({
  payments,
  onAdd,
  onDelete,
}: {
  payments: Payment[];
  onAdd: (amount: number, paidAt: string, memo: string) => Promise<void>;
  onDelete: (paymentId: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(todayStr());
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return;
    setSubmitting(true);
    try {
      await onAdd(value, paidAt, memo);
      setAmount("");
      setMemo("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <p className="mb-2 text-xs font-medium text-slate-500">입금 내역</p>
      {payments.length === 0 ? (
        <p className="text-xs text-slate-400">입금 기록이 없습니다.</p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
              <span className="text-slate-600">
                {p.paidAt.slice(0, 10)} · {formatKRW(p.amount)}
                {p.memo && <span className="text-slate-400"> · {p.memo}</span>}
              </span>
              <button
                onClick={() => onDelete(p.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">입금일</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">금액</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">메모 (선택)</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예약금, 잔금 1차 등"
            className="w-40 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        >
          입금 추가
        </button>
      </form>
    </div>
  );
}
