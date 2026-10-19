export const markShutdownAttendees = async ({ attendees, date, getAttendance, markPresent }) => {
  let markedCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const attendee of attendees) {
    try {
      const records = await getAttendance(attendee.id, date);
      const alreadyPresent = records.some((record) => (
        String(record.attendance_date ?? '').slice(0, 10) === date
        && (record.shutdown_present
          || Number(record.status) === 1
          || record.check_in
          || record.open_attendance?.check_in)
      ));
      if (alreadyPresent) {
        skippedCount += 1;
        continue;
      }

      await markPresent(attendee.id, date);
      markedCount += 1;
    } catch (error) {
      failures.push({ attendee, error });
    }
  }

  return { markedCount, skippedCount, failures };
};
