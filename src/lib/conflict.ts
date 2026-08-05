import { prisma } from "@/lib/prisma";

// 같은 날짜, 같은 강의실 또는 같은 강사의 시간대가 겹치는 세션이 있는지 확인합니다.
// 겹치면 사람이 읽을 수 있는 에러 메시지를, 없으면 null 을 반환합니다.
export async function findConflict({
  date,
  startTime,
  endTime,
  roomId,
  teacherId,
  excludeSessionId,
}: {
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
  excludeSessionId?: string;
}) {
  const candidates = await prisma.classSession.findMany({
    where: {
      date: new Date(date),
      status: { not: "CANCELED" },
      OR: [{ roomId }, { teacherId }],
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
    },
    include: {
      teacher: true,
      room: true,
      enrollment: { include: { student: true } },
    },
  });

  const overlapping = candidates.find(
    (s) => startTime < s.endTime && endTime > s.startTime
  );

  if (!overlapping) return null;

  const sameRoom = overlapping.roomId === roomId;
  const sameTeacher = overlapping.teacherId === teacherId;
  const who = overlapping.enrollment.student.name;
  const when = `${overlapping.startTime}-${overlapping.endTime}`;

  if (sameRoom && sameTeacher) {
    return `${overlapping.room.name} 강의실, ${overlapping.teacher.name} 강사 모두 ${when}에 ${who} 학생 수업과 겹칩니다.`;
  }
  if (sameRoom) {
    return `${overlapping.room.name} 강의실이 ${when}에 이미 사용 중입니다 (${who}).`;
  }
  return `${overlapping.teacher.name} 강사가 ${when}에 이미 다른 수업이 있습니다 (${who}).`;
}
