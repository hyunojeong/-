import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findConflict } from "@/lib/conflict";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const sessions = await prisma.classSession.findMany({
    where: {
      ...(from && to
        ? { date: { gte: new Date(from), lte: new Date(to) } }
        : undefined),
    },
    include: {
      teacher: true,
      room: true,
      enrollment: { include: { student: true, courseType: true } },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(sessions);
}

const createSchema = z.object({
  enrollmentId: z.string().min(1),
  teacherId: z.string().min(1),
  roomId: z.string().min(1),
  date: z.string().min(1), // "YYYY-MM-DD"
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  sessionNumber: z.number().int().positive().nullable().optional(),
  memo: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.startTime >= data.endTime) {
    return NextResponse.json({ error: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });
  }

  const conflict = await findConflict({
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    roomId: data.roomId,
    teacherId: data.teacherId,
  });
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 409 });
  }

  const session = await prisma.classSession.create({
    data: {
      enrollmentId: data.enrollmentId,
      teacherId: data.teacherId,
      roomId: data.roomId,
      date: new Date(data.date),
      startTime: data.startTime,
      endTime: data.endTime,
      sessionNumber: data.sessionNumber ?? null,
      memo: data.memo ?? null,
    },
    include: {
      teacher: true,
      room: true,
      enrollment: { include: { student: true, courseType: true } },
    },
  });
  return NextResponse.json(session, { status: 201 });
}
