import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: {
          courseType: true,
          sessions: { orderBy: { date: "asc" } },
          payments: { orderBy: { paidAt: "desc" } },
        },
      },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(student);
}

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional().nullable(),
  memo: z.string().trim().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const student = await prisma.student.update({ where: { id }, data: parsed.data });
  return NextResponse.json(student);
}
