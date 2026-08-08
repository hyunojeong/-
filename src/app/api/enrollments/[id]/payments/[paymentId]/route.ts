import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.enrollmentId !== id) {
    return NextResponse.json({ error: "입금 내역을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.payment.delete({ where: { id: paymentId } }),
    prisma.enrollment.update({ where: { id }, data: { paidAmount: { decrement: payment.amount } } }),
  ]);
  return NextResponse.json({ ok: true });
}
