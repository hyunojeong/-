"use client";

import { useEffect, useState } from "react";

type CourseType = {
  id: string;
  name: string;
  defaultPrice: number;
  defaultSessions: number | null;
};

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function CourseTypesPage() {
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sessions, setSessions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/course-types");
    const data = await res.json();
    setCourseTypes(data);
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
      const res = await fetch("/api/course-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          defaultPrice: Number(price),
          defaultSessions: sessions ? Number(sessions) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        return;
      }
      setName("");
      setPrice("");
      setSessions("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePrice(ct: CourseType, newPrice: number) {
    if (Number.isNaN(newPrice) || newPrice < 0) return;
    await fetch(`/api/course-types/${ct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultPrice: newPrice }),
    });
    await load();
  }

  async function updateSessions(ct: CourseType, newSessions: number) {
    if (Number.isNaN(newSessions) || newSessions < 1) return;
    await fetch(`/api/course-types/${ct.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultSessions: newSessions }),
    });
    await load();
  }

  async function handleDelete(ct: CourseType) {
    if (!confirm(`"${ct.name}" 과정을 삭제할까요?`)) return;
    const res = await fetch(`/api/course-types/${ct.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">과정 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          과정을 추가·삭제하고 기본 강의료와 회차수를 관리합니다.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">과정명</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="예: 정규"
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            기본 패키지 총액 (원)
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            type="number"
            min={0}
            placeholder="예: 780000"
            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            기본 회차수 (선택)
          </label>
          <input
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
            type="number"
            min={1}
            placeholder="예: 8"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          과정 추가
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">과정명</th>
              <th className="px-4 py-3">기본 패키지 총액</th>
              <th className="px-4 py-3">기본 회차수</th>
              <th className="px-4 py-3" />
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
            {!loading && courseTypes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  등록된 과정이 없습니다.
                </td>
              </tr>
            )}
            {courseTypes.map((ct) => (
              <tr key={ct.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {ct.name}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={ct.defaultPrice}
                    onBlur={(e) => updatePrice(ct, Number(e.target.value))}
                    className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                  <span className="ml-1 text-xs text-slate-400">
                    ({formatKRW(ct.defaultPrice)})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    defaultValue={ct.defaultSessions ?? ""}
                    onBlur={(e) => updateSessions(ct, Number(e.target.value))}
                    className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(ct)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
