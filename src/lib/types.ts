export const STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface Application {
  id: string;
  company: string;
  role: string;
  jdExcerpt: string;
  bullets: string;
  status: Status;
  createdAt: string;
}
