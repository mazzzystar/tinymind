import { format, toZonedTime } from 'date-fns-tz';
import { parseISO } from 'date-fns';

export const formatTimestamp = (timestamp: string) => {
  let date: Date;
  
  // Try to parse the timestamp as an ISO string
  try {
    date = parseISO(timestamp);
  } catch (error) {
    // If parsing fails, fall back to creating a new Date object
    date = new Date(timestamp);
  }

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', timestamp);
    return 'Invalid date';
  }

  // Get the user's time zone
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert UTC date to user's local time zone
  const zonedDate = toZonedTime(date, userTimeZone);

  // Format the date string in the user's local time zone
  const localDateString = format(zonedDate, "yyyy-MM-dd HH:mm:ss", { timeZone: userTimeZone });
  const utcOffset = format(zonedDate, "xxxxx", { timeZone: userTimeZone });

  return `${localDateString} (UTC${utcOffset})`;
};