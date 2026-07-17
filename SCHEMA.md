# Firestore Data Model

## `users/{uid}`
```
{
  role: "teacher" | "student",
  name: string,
  email: string,
  photoURL: string,
  teacherId: string | null,      // set on students once connected
  inviteCode: string | null,     // set on teachers, used for connecting
  rescheduleCutoffHours: number | null  // teacher-only, configurable (default 48)
}
```

## `users/{teacherId}/students/{studentId}`
Mirror doc on the teacher side for fast roster queries.
```
{
  studentId: string,
  name: string,
  email: string,
  recurringSlot: {
    dayOfWeek: number,   // 0-6
    startTime: string,   // "16:30"
    durationMinutes: number
  },
  connectedAt: timestamp
}
```

## `users/{teacherId}/availability/{blockId}`
Teacher's general weekly open blocks (the pool slots are drawn from).
```
{
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  recurring: true
}
```
One-off overrides (e.g. blocked days, extra open slots) live in:
## `users/{teacherId}/availabilityOverrides/{dateId}`  (dateId = "2026-08-03")
```
{
  date: string,
  type: "blocked" | "open",
  startTime: string | null,
  endTime: string | null
}
```

## `users/{teacherId}/lessons/{lessonId}`
Concrete scheduled lesson instances (generated from recurringSlot, plus any
rescheduled ones). This is what both teacher and student calendars render from.
```
{
  studentId: string,
  studentName: string,
  date: string,          // "2026-08-03"
  startTime: string,
  durationMinutes: number,
  status: "confirmed" | "pending_reschedule" | "cancelled",
  originalDate: string | null,   // set if this lesson was moved
  rescheduleRequestedBy: "student" | "teacher" | null
}
```

## `users/{teacherId}/rescheduleRequests/{requestId}`
Only created when a request falls inside the teacher's cutoff window and
needs approval. Requests outside the window are applied directly to the
`lessons` doc without creating one of these.
```
{
  studentId: string,
  studentName: string,
  lessonId: string,
  fromDate: string,
  toDate: string,
  toStartTime: string,
  requestedAt: timestamp,
  status: "pending" | "approved" | "denied"
}
```

## Connection flow (mirrors the dance tracker's parent-student linking)
Two ways to connect, same as the dance app offered parents:

**Invite code (instant, no confirmation):**
1. Teacher's `inviteCode` is generated once and shown/shared by the teacher.
2. Student signs in with Google, enters the invite code.
3. Client looks up the teacher by `inviteCode`, writes `teacherId` onto the
   student's user doc, and creates the mirrored doc under
   `users/{teacherId}/students/{studentId}`.

**Email + confirmation (either side can initiate):**
1. Either the student enters the teacher's email, or the teacher enters a
   student's email — both require the other person to have signed in at
   least once already (so their `users/{uid}` doc exists to look up).
2. This creates a `connectionRequests/{id}` doc with `status: "pending"`.
3. The receiving side sees it (teacher: on their dashboard; student: on the
   choose-role screen) and clicks Confirm or Decline.
4. Confirming runs the same linking logic as the invite-code path.

## `connectionRequests/{id}`
```
{
  studentId, studentName, studentEmail,
  teacherId, teacherName, teacherEmail,
  initiatedBy: "student" | "teacher",
  status: "pending" | "accepted" | "rejected",
  createdAt: timestamp
}
```

Either way, the teacher then assigns the student's `recurringSlot` from the roster view.