/**
 * Curated festival calendar for 2026 (Hindu lunar dates + global holidays).
 * Lunar-based festivals (Eid, Ramadan) are marked tentative because they
 * depend on moon sighting and can shift by a day.
 */
export interface FestivalEntry {
  name: string;
  date: string; // ISO date, e.g. "2026-11-08"
  tentative?: boolean;
}

export const FESTIVALS_2026: FestivalEntry[] = [
  { name: "New Year's Day", date: "2026-01-01" },
  { name: "Lohri", date: "2026-01-13" },
  { name: "Makar Sankranti", date: "2026-01-14" },
  { name: "Pongal", date: "2026-01-14" },
  { name: "Vasant Panchami", date: "2026-01-23" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Valentine's Day", date: "2026-02-14" },
  { name: "Maha Shivaratri", date: "2026-02-15" },
  { name: "Holika Dahan", date: "2026-03-03" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Ugadi / Gudi Padwa", date: "2026-03-19" },
  { name: "Eid-ul-Fitr", date: "2026-03-21", tentative: true },
  { name: "Ram Navami", date: "2026-03-26" },
  { name: "Hanuman Jayanti", date: "2026-04-02" },
  { name: "Good Friday", date: "2026-04-03" },
  { name: "Easter Sunday", date: "2026-04-05" },
  { name: "Vaisakhi / Baisakhi", date: "2026-04-14" },
  { name: "Akshaya Tritiya", date: "2026-04-19" },
  { name: "Buddha Purnima", date: "2026-05-01" },
  { name: "Eid-ul-Adha (Bakrid)", date: "2026-05-27", tentative: true },
  { name: "Rath Yatra", date: "2026-07-16" },
  { name: "Guru Purnima", date: "2026-07-29" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Nag Panchami", date: "2026-08-17" },
  { name: "Onam", date: "2026-08-26" },
  { name: "Raksha Bandhan", date: "2026-08-28" },
  { name: "Krishna Janmashtami", date: "2026-09-04" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Shardiya Navratri begins", date: "2026-10-11" },
  { name: "Durga Puja (Ashtami / Maha Navami)", date: "2026-10-19" },
  { name: "Dussehra / Vijayadashami", date: "2026-10-20" },
  { name: "Karwa Chauth", date: "2026-10-29" },
  { name: "Halloween", date: "2026-10-31" },
  { name: "Dhanteras", date: "2026-11-06" },
  { name: "Kali Puja / Chhoti Diwali", date: "2026-11-07" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Govardhan Puja", date: "2026-11-09" },
  { name: "Bhai Dooj", date: "2026-11-10" },
  { name: "Chhath Puja", date: "2026-11-15" },
  { name: "Guru Nanak Jayanti", date: "2026-11-24" },
  { name: "Thanksgiving", date: "2026-11-26" },
  { name: "Christmas Eve", date: "2026-12-24" },
  { name: "Christmas Day", date: "2026-12-25" },
];

/** Formats a date as "Nov 8, 2026". */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][month - 1];
  return `${monthName} ${day}, ${year}`;
}

/** Compact block injected into the AI system prompt. */
export function festivalCalendarBlock(): string {
  const lines = FESTIVALS_2026.map(
    (festival) =>
      `- ${festival.name}${festival.tentative ? " (tentative, depends on moon sighting)" : ""}: ${formatDate(festival.date)}`
  );
  return [
    "[FESTIVAL CALENDAR 2026]",
    "Use these verified dates when answering questions about festivals, holidays, or auspicious days. Prefer this calendar over your training data. For 2025 or 2027 dates the model does not have from this calendar, say so rather than guessing.",
    ...lines,
  ].join("\n");
}
