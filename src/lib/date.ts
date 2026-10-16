// Date formatting, the one place it lives (spec 0010).

// Cuba's time zone, not the build machine's: Vercel builds in UTC, so without it a build
// after 8 p.m. in Cuba would show the next day.
const dayFormat = new Intl.DateTimeFormat('es-ES', {
	day: 'numeric',
	month: 'long',
	timeZone: 'America/Havana',
});

// 2026-10-16 → "16 de octubre".
export function formatDay(date: Date): string {
	return dayFormat.format(date);
}
