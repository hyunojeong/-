import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(1, "과정명을 입력해주세요."),
  defaultPrice: z.number().int().nonnegative(),
  defaultSessions: z.number().int().positive().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "1";
  const courseTypes = await prisma.courseType.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(courseTypes);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const existing = await prisma.courseType.findUnique({ where: { name: parsed.data.name } });
  if (existing) {
    if (existing.isActive) {
      return NextResponse.json({ error: "이미 존재하는 과정명입니다." }, { status: 409 });
    }
    // 예전에 삭제(숨김) 처리된 과정과 이름이 같으면 새 값으로 되살린다
    const revived = await prisma.courseType.update({
      where: { id: existing.id },
      data: { ...parsed.data, isActive: true },
    });
    return NextResponse.json(revived, { status: 201 });
  }

  const courseType = await prisma.courseType.create({ data: parsed.data });
  return NextResponse.json(courseType, { status: 201 });
}
