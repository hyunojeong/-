import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  amount: z.number().int().positive(),
  paidAt: z.string().min(1),
  memo: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const { amount, paidAt, memo } = parsed.data;

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { enrollmentId: id, amount, paidAt: new Date(paidAt), memo } }),
    prisma.enrollment.update({ where: { id }, data: { paidAmount: { increment: amount } } }),
  ]);
  return NextResponse.json(payment, { status: 201 });
}
