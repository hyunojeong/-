"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import SessionModal, { SessionModalData } from "@/components/SessionModal";

type Teacher = { id: string; name: string; color: string };
type Room = { id: string; name: string };
type SessionRoom = Room & { isActive: boolean };

type SessionApiItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionNumber: number | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
  teacher: Teacher;
  room: SessionRoom;
  enrollment: {
    id: string;
    totalSessions: number;
    student: { id: string; name: string };
    courseType: { id: string; name: string };
  };
};

export default function CalendarPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [teacherFilter, setTeacherFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("");
  const [modal, setModal] = useState<
    | { mode: "create"; data: SessionModalData }
    | { mode: "edit"; data: SessionModalData }
    | null
  >(null);
  const rawSessions = useRef<SessionApiItem[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const loadRefData = useCallback(async () => {
    const [teachersRes, roomsRes] = await Promise.all([
      fetch("/api/teachers"),
      fetch("/api/rooms"),
    ]);
    setTeachers(await teachersRes.json());
    setRooms(await roomsRes.json());
  }, []);

  const applyFilters = useCallback(
    (list: SessionApiItem[], tFilter: string, rFilter: string) => {
      const filtered = list.filter(
        (s) =>
          s.status !== "CANCELED" &&
          (!tFilter || s.teacher.id === tFilter) &&
          (!rFilter || s.room.id === rFilter)
      );
      const mapped: EventInput[] = filtered.map((s) => ({
        id: s.id,
        title: s.room.isActive
          ? `${s.enrollment.student.name} (${s.enrollment.courseType.name}) - ${s.room.name}`
          : `${s.enrollment.student.name} (${s.enrollment.courseType.name})`,
        start: `${s.date.slice(0, 10)}T${s.startTime}`,
        end: `${s.date.slice(0, 10)}T${s.endTime}`,
        backgroundColor: s.teacher.color,
        borderColor: s.teacher.color,
        extendedProps: { session: s },
      }));
      setEvents(mapped);
    },
    []
  );

  const handleDatesSet = useCallback(
    async (arg: { startStr: string; endStr: string }) => {
      await loadRefData();
      const res = await fetch(
        `/api/sessions?from=${arg.startStr.slice(0, 10)}&to=${arg.endStr.slice(0, 10)}`
      );
      const data: SessionApiItem[] = await res.json();
      rawSessions.current = data;
      applyFilters(data, teacherFilter, roomFilter);
    },
    [loadRefData, applyFilters, teacherFilter, roomFilter]
  );

  function refilter(tFilter: string, rFilter: string) {
    applyFilters(rawSessions.current, tFilter, rFilter);
  }

  function handleDateClick(arg: DateClickArg) {
    const date = arg.dateStr.slice(0, 10);
    const time = arg.dateStr.length > 10 ? arg.dateStr.slice(11, 16) : "13:00";
    setModal({
      mode: "create",
      data: {
        enrollment: null,
        teacherId: teacherFilter || teachers[0]?.id || "",
        roomId: roomFilter || rooms[0]?.id || "",
        date,
        startTime: time,
        endTime: addMinutes(time, 90),
        sessionNumber: "",
      },
    });
  }

  function handleEventClick(arg: EventClickArg) {
    const s: SessionApiItem = arg.event.extendedProps.session;
    setModal({
      mode: "edit",
      data: {
        id: s.id,
        enrollment: s.enrollment,
        teacherId: s.teacher.id,
        roomId: s.room.id,
        date: s.date.slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        sessionNumber: s.sessionNumber ? String(s.sessionNumber) : "",
        status: s.status,
      },
    });
  }

  async function reloadEvents() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    const start = api.view.activeStart.toISOString().slice(0, 10);
    const end = api.view.activeEnd.toISOString().slice(0, 10);
    const res = await fetch(`/api/sessions?from=${start}&to=${end}`);
    const data: SessionApiItem[] = await res.json();
    rawSessions.current = data;
    applyFilters(data, teacherFilter, roomFilter);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">캘린더</h1>
          <p className="mt-1 text-sm text-slate-500">
            날짜를 클릭해 수업을 등록하고, 등록된 수업을 클릭해 수정하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={teacherFilter}
            onChange={(e) => {
              setTeacherFilter(e.target.value);
              refilter(e.target.value, roomFilter);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체 강사</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={roomFilter}
            onChange={(e) => {
              setRoomFilter(e.target.value);
              refilter(teacherFilter, e.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">전체 강의실</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} 강의실
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          locale="ko"
          height="auto"
          events={events}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {teachers.map((t) => (
          <span key={t.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
          </span>
        ))}
      </div>

      {modal && (
        <SessionModal
          mode={modal.mode}
          initial={modal.data}
          teachers={teachers}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await reloadEvents();
          }}
          onDeleted={async () => {
            setModal(null);
            await reloadEvents();
          }}
        />
      )}
    </div>
  );
}

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
