import { format, formatISO } from 'date-fns';

export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const localDateString = format(date, "yyyy-MM-dd HH:mm:ss");
  const utcOffset = formatISO(date, { format: "extended" }).slice(-6);
  return `${localDateString} (UTC${utcOffset})`;
};