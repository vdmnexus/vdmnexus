export type PhaseStatus = "active" | "upcoming" | "completed";
export type ItemStatus = "done" | "in_progress" | "planned";

export type RoadmapPhase = {
  id: string;
  title: string;
  order_index: number;
  status: PhaseStatus;
};

export type RoadmapItem = {
  id: string;
  phase_id: string;
  title: string;
  status: ItemStatus;
  order_index: number;
  updated_at: string;
};

export type PhaseWithItems = RoadmapPhase & { items: RoadmapItem[] };

export type BuildLogEntry = {
  id: string;
  date: string;
  entry: string;
  tags: string[] | null;
  created_at: string;
};

export const PHASE_STATUSES: PhaseStatus[] = ["active", "upcoming", "completed"];
export const ITEM_STATUSES: ItemStatus[] = ["planned", "in_progress", "done"];

export function nextItemStatus(current: ItemStatus): ItemStatus {
  const i = ITEM_STATUSES.indexOf(current);
  return ITEM_STATUSES[(i + 1) % ITEM_STATUSES.length]!;
}
