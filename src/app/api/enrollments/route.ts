import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  studentId: z.string().min(1),
  courseTypeId: z.string().min(1),
  totalSessions: z.number().int().positive(),
  // 미지정 시 CourseType 의 기본 강의료를 스냅샷으로 사용, 지정 시 수동 조정된 금액 사용
  price: z.number().int().nonnegative().optional(),
  paidAmount: z.number().int().nonnegative().default(0),
  memo: z.string().trim().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("studentQuery")?.trim();
  const enrollments = await prisma.enrollment.findMany({
    where: q ? { student: { name: { contains: q } } } : undefined,
    orderBy: { createdAt: "desc" },
    include: { student: true, courseType: true },
    take: 20,
  });
  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { studentId, courseTypeId, totalSessions, paidAmount, memo } = parsed.data;

  const courseType = await prisma.courseType.findUnique({ where: { id: courseTypeId } });
  if (!courseType) {
    return NextResponse.json({ error: "과정을 찾을 수 없습니다." }, { status: 404 });
  }

  // 가격은 등록 시점에 스냅샷 저장 -> 이후 CourseType 기본가가 바뀌어도 이 등록건은 영향받지 않음
  const price = parsed.data.price ?? courseType.defaultPrice;

  const enrollment = await prisma.enrollment.create({
    data: { studentId, courseTypeId, totalSessions, price, paidAmount, memo },
    include: { courseType: true },
  });

  if (paidAmount > 0) {
    await prisma.payment.create({
      data: { enrollmentId: enrollment.id, amount: paidAmount, paidAt: new Date(), memo: "최초 등록 시 입금" },
    });
  }

  return NextResponse.json(enrollment, { status: 201 });
}
