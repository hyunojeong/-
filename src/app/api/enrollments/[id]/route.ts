import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  price: z.number().int().nonnegative().optional(),
  totalSessions: z.number().int().positive().optional(),
  memo: z.string().trim().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const enrollment = await prisma.enrollment.update({
    where: { id },
    data: parsed.data,
    include: { courseType: true },
  });
  return NextResponse.json(enrollment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.enrollment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
