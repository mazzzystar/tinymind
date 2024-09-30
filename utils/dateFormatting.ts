export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);

  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', timestamp);
    return 'Invalid date';
  }

  // Format the date string in the user's local time zone
  const localDateString = date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Get the UTC offset
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
  const offsetMinutesPart = Math.abs(offsetMinutes % 60);
  const offsetSign = offsetMinutes > 0 ? '-' : '+';
  const utcOffset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutesPart.toString().padStart(2, '0')}`;

  return `${localDateString.replace(',', '')} (UTC${utcOffset})`;
};