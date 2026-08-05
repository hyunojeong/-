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
    orderBy: { createdAt: "desc" },
    include: {
      enrollments: {
        select: { id: true, price: true, paidAmount: true, courseType: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(students);
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
