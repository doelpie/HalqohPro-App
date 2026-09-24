/**
 * Universal iCalendar (.ics) Generator & Parser (RFC 5545)
 * 100% Compatible with Google Calendar, Apple Calendar (macOS/iOS),
 * Windows / Microsoft Outlook, and Android Calendar.
 */

export interface ICSEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  endTime?: string; // HH:mm
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function escapeICSText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function unescapeICSText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function formatToICSDateTime(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/[^0-9]/g, '');
  const y = cleanDate.slice(0, 4);
  const m = cleanDate.slice(4, 6);
  const d = cleanDate.slice(6, 8);

  if (!timeStr) {
    // All-day event date format
    return `${y}${m}${d}`;
  }

  const [hours, minutes] = timeStr.split(':');
  const h = hours ? padZero(parseInt(hours, 10)) : '00';
  const min = minutes ? padZero(parseInt(minutes, 10)) : '00';
  return `${y}${m}${d}T${h}${min}00`;
}

function addOneHour(timeStr?: string): string {
  if (!timeStr) return '17:00';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10) + 1;
  if (h >= 24) h = 23;
  return `${padZero(h)}:${mStr || '00'}`;
}

export function generateICS(calendarTitle: string, events: ICSEvent[]): string {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${padZero(now.getUTCMonth() + 1)}${padZero(now.getUTCDate())}T${padZero(now.getUTCHours())}${padZero(now.getUTCMinutes())}${padZero(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HalaqohPro//Calendar//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(calendarTitle)}`,
    'X-WR-TIMEZONE:Asia/Jakarta'
  ];

  events.forEach((evt, idx) => {
    const uid = evt.id || `evt-${Date.now()}-${idx}@halaqohpro.app`;
    const dtstart = formatToICSDateTime(evt.date, evt.time);
    const endTime = evt.endTime || addOneHour(evt.time);
    const dtend = formatToICSDateTime(evt.date, endTime);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    if (evt.time) {
      lines.push(`DTSTART:${dtstart}`);
      lines.push(`DTEND:${dtend}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
      lines.push(`DTEND;VALUE=DATE:${dtend}`);
    }
    lines.push(`SUMMARY:${escapeICSText(evt.title)}`);
    if (evt.description) {
      lines.push(`DESCRIPTION:${escapeICSText(evt.description)}`);
    }
    if (evt.location) {
      lines.push(`LOCATION:${escapeICSText(evt.location)}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(filename: string, calendarTitle: string, events: ICSEvent[]): void {
  const icsContent = generateICS(calendarTitle, events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseICS(icsText: string): ICSEvent[] {
  // Unfold multi-line strings in RFC 5545 (a newline followed by a single space or tab is a continuation)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: ICSEvent[] = [];
  let inEvent = false;
  let currentEvent: Partial<ICSEvent> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.title && currentEvent.date) {
        events.push({
          id: currentEvent.id || `ics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: currentEvent.title,
          description: currentEvent.description || '',
          location: currentEvent.location || '',
          date: currentEvent.date,
          time: currentEvent.time || '09:00',
          endTime: currentEvent.endTime || '10:00'
        });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const propNameAndParams = line.slice(0, colonIdx).toUpperCase();
    const propValue = line.slice(colonIdx + 1);

    if (propNameAndParams.startsWith('SUMMARY')) {
      currentEvent.title = unescapeICSText(propValue);
    } else if (propNameAndParams.startsWith('DESCRIPTION')) {
      currentEvent.description = unescapeICSText(propValue);
    } else if (propNameAndParams.startsWith('LOCATION')) {
      currentEvent.location = unescapeICSText(propValue);
    } else if (propNameAndParams.startsWith('UID')) {
      currentEvent.id = propValue.trim();
    } else if (propNameAndParams.startsWith('DTSTART')) {
      const val = propValue.trim();
      // Format can be YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD
      if (val.length >= 8) {
        const y = val.slice(0, 4);
        const m = val.slice(4, 6);
        const d = val.slice(6, 8);
        currentEvent.date = `${y}-${m}-${d}`;

        const tIdx = val.indexOf('T');
        if (tIdx !== -1 && val.length >= tIdx + 5) {
          const h = val.slice(tIdx + 1, tIdx + 3);
          const min = val.slice(tIdx + 3, tIdx + 5);
          currentEvent.time = `${h}:${min}`;
        } else {
          currentEvent.time = '09:00';
        }
      }
    } else if (propNameAndParams.startsWith('DTEND')) {
      const val = propValue.trim();
      const tIdx = val.indexOf('T');
      if (tIdx !== -1 && val.length >= tIdx + 5) {
        const h = val.slice(tIdx + 1, tIdx + 3);
        const min = val.slice(tIdx + 3, tIdx + 5);
        currentEvent.endTime = `${h}:${min}`;
      }
    }
  }

  return events;
}
