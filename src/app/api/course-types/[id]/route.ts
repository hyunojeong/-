import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  defaultPrice: z.number().int().nonnegative().optional(),
  defaultSessions: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const courseType = await prisma.courseType.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(courseType);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.courseType.delete({ where: { id } });
  } catch {
    // 과거 학생 등록 내역이 남아있어 완전히 지울 수 없는 경우: 기존 데이터는 보존하고
    // 목록/신규 등록 선택지에서만 숨긴다 (사용자에게는 "삭제"와 동일하게 보임)
    await prisma.courseType.update({ where: { id }, data: { isActive: false } });
  }
  return NextResponse.json({ ok: true });
}
