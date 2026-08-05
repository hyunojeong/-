"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudentListItem = {
  id: string;
  name: string;
  phone: string | null;
  enrollments: {
    id: string;
    price: number;
    paidAmount: number;
    courseType: { name: string };
  }[];
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(query = "") {
    setLoading(true);
    const res = await fetch(`/api/students${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setStudents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setName("");
      setPhone("");
      await load(q);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">학생 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          학생을 등록하고 수강 과정·결제 현황을 관리합니다.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">연락처</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          학생 추가
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          placeholder="이름으로 검색"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          onClick={() => load(q)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          검색
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">연락처</th>
              <th className="px-4 py-3">수강 과정</th>
              <th className="px-4 py-3">결제 현황</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  등록된 학생이 없습니다.
                </td>
              </tr>
            )}
            {students.map((s) => {
              const totalPrice = s.enrollments.reduce((sum, e) => sum + e.price, 0);
              const totalPaid = s.enrollments.reduce((sum, e) => sum + e.paidAmount, 0);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.enrollments.length === 0
                      ? "-"
                      : s.enrollments.map((e) => e.courseType.name).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.enrollments.length === 0 ? (
                      "-"
                    ) : totalPrice === 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        금액 미입력
                      </span>
                    ) : totalPaid >= totalPrice ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        완납 ({formatKRW(totalPrice)})
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        잔금 {formatKRW(totalPrice - totalPaid)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
