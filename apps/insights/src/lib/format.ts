export const fmtMoney = (n: number) => n.toLocaleString("en-GB", { minimumFractionDigits: n < 10 ? 2 : 0, maximumFractionDigits: n < 10 ? 2 : 0 });
export const monthLabel = (ym: string) => { const [y, m] = ym.split("-").map(Number); return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }); };
export const REGION_LABEL: Record<string, string> = { AFRO: "Africa", AMRO: "The Americas", EMRO: "Eastern Mediterranean", EURO: "Europe", SEARO: "South-East Asia", WPRO: "Western Pacific" };
export const regionLabel = (r: string | null) => (r ? REGION_LABEL[r] ?? r : "Not stated");

/** A price with its currency code in front, for example "USD 3,577" (ISO 4217 code, written as the code so it is never mistaken for another currency that shares a symbol). */
export const fmtMoneyIn = (n: number, currency: string) => `${currency} ${fmtMoney(n)}`;
