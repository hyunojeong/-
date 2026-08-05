import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findConflict } from "@/lib/conflict";

const updateSchema = z.object({
  teacherId: z.string().min(1).optional(),
  roomId: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sessionNumber: z.number().int().positive().nullable().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELED"]).optional(),
  memo: z.string().trim().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const existing = await prisma.classSession.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }

  const merged = {
    date: parsed.data.date ?? existing.date.toISOString().slice(0, 10),
    startTime: parsed.data.startTime ?? existing.startTime,
    endTime: parsed.data.endTime ?? existing.endTime,
    roomId: parsed.data.roomId ?? existing.roomId,
    teacherId: parsed.data.teacherId ?? existing.teacherId,
  };

  if (merged.startTime >= merged.endTime) {
    return NextResponse.json({ error: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });
  }

  if (parsed.data.status !== "CANCELED") {
    const conflict = await findConflict({ ...merged, excludeSessionId: id });
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 });
    }
  }

  const session = await prisma.classSession.update({
    where: { id },
    data: {
      ...parsed.data,
      date: parsed.data.date ? new Date(parsed.data.date) : undefined,
    },
    include: {
      teacher: true,
      room: true,
      enrollment: { include: { student: true, courseType: true } },
    },
  });
  return NextResponse.json(session);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.classSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
