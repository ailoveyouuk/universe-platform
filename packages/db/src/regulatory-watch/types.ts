/** Regulatory watch (Product Database step 4b): normalised item shape shared by every connector. */
export const RegulatoryWatchSource = {
  OPENFDA_DEVICE: "OPENFDA_DEVICE",
  OPENFDA_DRUG: "OPENFDA_DRUG",
  MHRA_ALERTS: "MHRA_ALERTS",
} as const;
export type RegulatoryWatchSource = (typeof RegulatoryWatchSource)[keyof typeof RegulatoryWatchSource];

export interface WatchItemInput {
  source: string;
  sourceReference: string;
  authority: string;
  noticeType: "RECALL" | "SAFETY_ALERT" | "FIELD_SAFETY_NOTICE" | "FALSIFIED_ALERT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  summary: string;
  actionRequired: string | null;
  affectedText: string | null;
  firmName: string | null;
  countryCodes: string | null;
  issueDate: Date;
  status: "OPEN" | "CLOSED";
  url: string | null;
}

export type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text?(): Promise<string> }>;

export interface Connector {
  source: RegulatoryWatchSource;
  /** Fetches every item published or updated on or after `since`. Throws on failure; returns [] for "no results". */
  fetchItems(since: Date, fetchFn: FetchLike): Promise<WatchItemInput[]>;
}
