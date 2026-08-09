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
    return NextResponse.json(
      { error: "이 과정을 사용 중인 학생 등록 내역이 있어 삭제할 수 없습니다." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
