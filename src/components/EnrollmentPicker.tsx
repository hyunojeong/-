"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type EnrollmentOption = {
  id: string;
  totalSessions: number;
  student: { id: string; name: string };
  courseType: { id: string; name: string };
};

export default function EnrollmentPicker({
  value,
  onChange,
}: {
  value: EnrollmentOption | null;
  onChange: (enrollment: EnrollmentOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EnrollmentOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/enrollments?studentQuery=${encodeURIComponent(query)}`);
      setOptions(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <span className="font-medium text-slate-900">{value.student.name}</span>
        <span className="text-slate-500">· {value.courseType.name}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          변경
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="학생 이름으로 검색"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">
              검색 결과가 없습니다. 먼저{" "}
              <Link href="/students" className="text-blue-600 hover:underline">
                학생 관리
              </Link>
              에서 수강 등록을 해주세요.
            </p>
          )}
          {options.map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setQuery("");
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{opt.student.name}</span>
              <span className="ml-2 text-slate-500">
                {opt.courseType.name} (총 {opt.totalSessions}회)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
