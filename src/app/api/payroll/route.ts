import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// month: "YYYY-MM"
export async function GET(req: NextRequest) {
  const teacherId = req.nextUrl.searchParams.get("teacherId");
  const month = req.nextUrl.searchParams.get("month");

  if (!teacherId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "teacherId, month(YYYY-MM) 파라미터가 필요합니다." }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    return NextResponse.json({ error: "강사를 찾을 수 없습니다." }, { status: 404 });
  }

  const [year, mon] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, mon - 1, 1));
  const to = new Date(Date.UTC(year, mon, 0)); // 해당 월의 마지막 날

  // 원장은 회차당 정액 급여가 아니라 실제 입금(매출) 기준으로 정산
  if (teacher.name === "원장") {
    const [payments, sessions] = await Promise.all([
      prisma.payment.findMany({
        where: { paidAt: { gte: from, lte: to } },
        include: { enrollment: { include: { student: true, courseType: true } } },
        orderBy: { paidAt: "desc" },
      }),
      prisma.classSession.findMany({
        where: { teacherId, status: { not: "CANCELED" }, date: { gte: from, lte: to } },
        include: { enrollment: true },
      }),
    ]);

    const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalSessions = sessions.length;
    const estimatedWorkValue = sessions.reduce((sum, s) => {
      const perSession = s.enrollment.totalSessions > 0 ? s.enrollment.price / s.enrollment.totalSessions : 0;
      return sum + Math.round(perSession);
    }, 0);

    return NextResponse.json({
      mode: "owner",
      teacher,
      month,
      revenue,
      payments,
      totalSessions,
      estimatedWorkValue,
    });
  }

  const sessions = await prisma.classSession.findMany({
    where: {
      teacherId,
      status: { not: "CANCELED" },
      date: { gte: from, lte: to },
    },
    include: {
      room: true,
      enrollment: { include: { student: true, courseType: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const totalSessions = sessions.length;
  const totalPay = totalSessions * teacher.payRate;

  return NextResponse.json({
    mode: "staff",
    teacher,
    month,
    sessions,
    totalSessions,
    totalPay,
  });
}
