import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teachers = await prisma.teacher.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(teachers);
}
