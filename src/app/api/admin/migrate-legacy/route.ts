import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 배포 후 1회성 데이터 이관용 임시 엔드포인트. 사용 후 삭제 예정.

const DEFAULT_TEACHERS = [
  { name: "원장", color: "#2563eb", payRate: 0 },
  { name: "스피치 선생님", color: "#db2777", payRate: 30000 },
];

const DEFAULT_ROOMS = ["A", "B"];

const DEFAULT_COURSE_TYPES = [
  { name: "정규", defaultPrice: 780000, defaultSessions: 8 },
  { name: "커스텀", defaultPrice: 450000, defaultSessions: 4 },
  { name: "KE-Fit", defaultPrice: 450000, defaultSessions: 5 },
  { name: "실전모의", defaultPrice: 450000, defaultSessions: 4 },
  { name: "스피치", defaultPrice: 300000, defaultSessions: 2 },
  { name: "원데이", defaultPrice: 120000, defaultSessions: 1 },
  { name: "1:1", defaultPrice: 150000, defaultSessions: 1 },
];

const NEW_COURSE_TYPES = [
  { name: "영상긴급", defaultPrice: 0 },
  { name: "정규Duo", defaultPrice: 0 },
  { name: "기타", defaultPrice: 0 },
];

type LegacyRow = {
  date: string;
  startTime: string;
  endTime: string;
  studentName: string;
  canonicalCourse: string;
  rawCourseLabel?: string;
  sessionNumber?: number | null;
  room: "A" | "B" | null;
  teacher: string;
  memo?: string | null;
};

export async function POST(req: NextRequest) {
  if (req.headers.get("x-migration-secret") !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  for (const t of DEFAULT_TEACHERS) {
    await prisma.teacher.upsert({ where: { id: t.name }, update: {}, create: { id: t.name, ...t } });
  }
  for (const r of DEFAULT_ROOMS) {
    await prisma.room.upsert({ where: { id: `room-${r}` }, update: {}, create: { id: `room-${r}`, name: r } });
  }
  for (const c of DEFAULT_COURSE_TYPES) {
    await prisma.courseType.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  for (const c of NEW_COURSE_TYPES) {
    await prisma.courseType.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  let unknownRoom = await prisma.room.findFirst({ where: { name: "미정 (엑셀 이관)" } });
  if (!unknownRoom) {
    unknownRoom = await prisma.room.create({ data: { name: "미정 (엑셀 이관)", isActive: false } });
  }

  const rows: LegacyRow[] = await req.json();

  const teachers = await prisma.teacher.findMany();
  const teacherByName = Object.fromEntries(teachers.map((t) => [t.name, t]));
  const rooms = await prisma.room.findMany();
  const roomByName = Object.fromEntries(rooms.map((r) => [r.name, r]));
  const courseTypes = await prisma.courseType.findMany();
  const courseByName = Object.fromEntries(courseTypes.map((c) => [c.name, c]));

  const studentCache = new Map<string, { id: string }>();
  const enrollmentCache = new Map<string, { id: string }>();

  let createdStudents = 0;
  let createdEnrollments = 0;
  let createdSessions = 0;
  let skippedDupSessions = 0;
  let skippedUnmatched = 0;

  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    let student = studentCache.get(row.studentName);
    if (!student) {
      const found = await prisma.student.findFirst({ where: { name: row.studentName } });
      student = found ?? (await prisma.student.create({ data: { name: row.studentName } }));
      if (!found) createdStudents++;
      studentCache.set(row.studentName, student);
    }

    const courseType = courseByName[row.canonicalCourse];
    if (!courseType) {
      skippedUnmatched++;
      continue;
    }

    const enrollKey = `${student.id}::${courseType.id}`;
    let enrollment = enrollmentCache.get(enrollKey);
    if (!enrollment) {
      const found = await prisma.enrollment.findFirst({
        where: { studentId: student.id, courseTypeId: courseType.id },
      });
      enrollment =
        found ??
        (await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseTypeId: courseType.id,
            price: 0,
            totalSessions: 0,
            paidAmount: 0,
            memo: "엑셀 스케줄 마이그레이션으로 생성 (금액 미상, 직접 입력 필요)",
          },
        }));
      if (!found) createdEnrollments++;
      enrollmentCache.set(enrollKey, enrollment);
    }

    const teacher = teacherByName[row.teacher];
    const room = row.room === "A" ? roomByName["A"] : row.room === "B" ? roomByName["B"] : unknownRoom;

    if (!teacher || !room) {
      skippedUnmatched++;
      continue;
    }

    const dup = await prisma.classSession.findFirst({
      where: { enrollmentId: enrollment.id, date: new Date(row.date), startTime: row.startTime },
    });
    if (dup) {
      skippedDupSessions++;
      continue;
    }

    await prisma.classSession.create({
      data: {
        enrollmentId: enrollment.id,
        teacherId: teacher.id,
        roomId: room.id,
        date: new Date(row.date),
        startTime: row.startTime,
        endTime: row.endTime,
        sessionNumber: row.sessionNumber ?? null,
        status: row.date < today ? "COMPLETED" : "SCHEDULED",
        memo: row.memo ?? null,
      },
    });
    createdSessions++;
  }

  for (const enrollment of enrollmentCache.values()) {
    const count = await prisma.classSession.count({ where: { enrollmentId: enrollment.id } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { totalSessions: count } });
  }

  return NextResponse.json({
    createdStudents,
    createdEnrollments,
    createdSessions,
    skippedDupSessions,
    skippedUnmatched,
    totalRows: rows.length,
  });
}
