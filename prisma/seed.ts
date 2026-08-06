import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
}

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teachers = [
    { name: "원장", color: "#2563eb", payRate: 0 },
    { name: "스피치 선생님", color: "#db2777", payRate: 30000 },
  ];
  for (const t of teachers) {
    await prisma.teacher.upsert({
      where: { id: t.name },
      update: {},
      create: { id: t.name, ...t },
    });
  }

  const rooms = ["A", "B"];
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: `room-${r}` },
      update: {},
      create: { id: `room-${r}`, name: r },
    });
  }

  const courseTypes = [
    { name: "정규", defaultPrice: 780000, defaultSessions: 8 },
    { name: "커스텀", defaultPrice: 450000, defaultSessions: 4 },
    { name: "KE-Fit", defaultPrice: 450000, defaultSessions: 5 },
    { name: "실전모의", defaultPrice: 450000, defaultSessions: 4 },
    { name: "스피치", defaultPrice: 300000, defaultSessions: 2 },
    { name: "원데이", defaultPrice: 120000, defaultSessions: 1 },
    { name: "1:1", defaultPrice: 150000, defaultSessions: 1 },
  ];
  for (const c of courseTypes) {
    await prisma.courseType.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
