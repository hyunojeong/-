import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  phone: z.string().trim().optional().nullable(),
  memo: z.string().trim().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const students = await prisma.student.findMany({
    where: q ? { name: { contains: q } } : undefined,
    include: {
      enrollments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          price: true,
          paidAmount: true,
          courseType: { select: { name: true } },
          sessions: { where: { status: { not: "CANCELED" } }, select: { date: true } },
        },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

  const withActivity = students.map((s) => {
    const enrollments = s.enrollments.map((e) => ({
      ...e,
      isCurrentMonth: e.sessions.some((sess) => sess.date >= monthStart && sess.date <= monthEnd),
    }));
    return {
      ...s,
      enrollments,
      isActiveNow: enrollments.some((e) => e.isCurrentMonth),
    };
  });

  withActivity.sort((a, b) => {
    if (a.isActiveNow !== b.isActiveNow) return a.isActiveNow ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });

  return NextResponse.json(withActivity);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const student = await prisma.student.create({ data: parsed.data });
  return NextResponse.json(student, { status: 201 });
}
