// 엑셀 스케줄(2026년 1~10월) 마이그레이션용 1회성 스크립트.
// 사용법: node scripts/import-legacy-schedule.mjs <import_ready.json 경로>
//
// 입력 JSON은 각 항목이 아래 형태여야 합니다:
// { date, startTime, endTime, studentName, canonicalCourse, rawCourseLabel,
//   sessionNumber, room: "A"|"B"|null, teacher, memo }
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const filePath = process.argv[2];
if (!filePath) {
  console.error("사용법: node scripts/import-legacy-schedule.mjs <import_ready.json 경로>");
  process.exit(1);
}

const rows = JSON.parse(readFileSync(filePath, "utf-8"));

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const NEW_COURSE_TYPES = [
  { name: "영상긴급", defaultPrice: 0 },
  { name: "정규Duo", defaultPrice: 0 },
  { name: "기타", defaultPrice: 0 },
];

async function main() {
  // 1. 신규 과정 준비
  for (const c of NEW_COURSE_TYPES) {
    await prisma.courseType.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  // 2. 마이그레이션 전용 "미정" 강의실 준비 (강의실 정보가 없던 과거 기록용, 선택 목록에는 노출 안 됨)
  let unknownRoom = await prisma.room.findFirst({ where: { name: "미정 (엑셀 이관)" } });
  if (!unknownRoom) {
    unknownRoom = await prisma.room.create({
      data: { name: "미정 (엑셀 이관)", isActive: false },
    });
  }

  const teachers = await prisma.teacher.findMany();
  const teacherByName = Object.fromEntries(teachers.map((t) => [t.name, t]));
  const rooms = await prisma.room.findMany();
  const roomByName = Object.fromEntries(rooms.map((r) => [r.name, r]));
  const courseTypes = await prisma.courseType.findMany();
  const courseByName = Object.fromEntries(courseTypes.map((c) => [c.name, c]));

  const studentCache = new Map();
  const enrollmentCache = new Map(); // key: studentId::courseTypeId

  let createdStudents = 0;
  let createdEnrollments = 0;
  let createdSessions = 0;
  let skippedDupSessions = 0;

  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    // 학생 확보
    let student = studentCache.get(row.studentName);
    if (!student) {
      student = await prisma.student.findFirst({ where: { name: row.studentName } });
      if (!student) {
        student = await prisma.student.create({ data: { name: row.studentName } });
        createdStudents++;
      }
      studentCache.set(row.studentName, student);
    }

    const courseType = courseByName[row.canonicalCourse];
    if (!courseType) {
      console.warn(`알 수 없는 과정: ${row.canonicalCourse} (스킵: ${row.studentName} ${row.date})`);
      continue;
    }

    // 수강등록 확보 (학생 x 과정 단위로 하나로 묶음)
    const enrollKey = `${student.id}::${courseType.id}`;
    let enrollment = enrollmentCache.get(enrollKey);
    if (!enrollment) {
      enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, courseTypeId: courseType.id },
      });
      if (!enrollment) {
        enrollment = await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseTypeId: courseType.id,
            price: 0,
            totalSessions: 0,
            paidAmount: 0,
            memo: "엑셀 스케줄 마이그레이션으로 생성 (금액 미상, 직접 입력 필요)",
          },
        });
        createdEnrollments++;
      }
      enrollmentCache.set(enrollKey, enrollment);
    }

    const teacher = teacherByName[row.teacher];
    const room = row.room === "A" ? roomByName["A"] : row.room === "B" ? roomByName["B"] : unknownRoom;

    if (!teacher || !room) {
      console.warn(`강사/강의실 매칭 실패, 스킵: ${JSON.stringify(row)}`);
      continue;
    }

    // 중복 방지: 같은 학생/과정/날짜/시작시간이면 이미 들어간 것으로 보고 스킵
    const dup = await prisma.classSession.findFirst({
      where: {
        enrollmentId: enrollment.id,
        date: new Date(row.date),
        startTime: row.startTime,
      },
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

  // 등록된 실제 세션 수에 맞춰 totalSessions 재계산
  for (const enrollment of enrollmentCache.values()) {
    const count = await prisma.classSession.count({ where: { enrollmentId: enrollment.id } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { totalSessions: count } });
  }

  console.log({ createdStudents, createdEnrollments, createdSessions, skippedDupSessions, totalRows: rows.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
