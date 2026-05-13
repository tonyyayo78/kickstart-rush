export type SlotDef = {
  slotOrder: number;
  label: string;
  x: number;
  y: number;
};

export type Formation = {
  id: string;
  label: string;
  slots: SlotDef[];
};

// ViewBox "0 0 300 450": attacking direction is upward (y=0 is top/attack end,
// y=450 is bottom/GK end). All coordinates are for the Kickstart squad.

export const FORMATIONS: Formation[] = [
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { slotOrder: 1, label: "GK", x: 150, y: 400 },
      { slotOrder: 2, label: "LB", x: 50, y: 320 },
      { slotOrder: 3, label: "CB", x: 117, y: 320 },
      { slotOrder: 4, label: "CB", x: 183, y: 320 },
      { slotOrder: 5, label: "RB", x: 250, y: 320 },
      { slotOrder: 6, label: "LM", x: 50, y: 210 },
      { slotOrder: 7, label: "CM", x: 117, y: 210 },
      { slotOrder: 8, label: "CM", x: 183, y: 210 },
      { slotOrder: 9, label: "RM", x: 250, y: 210 },
      { slotOrder: 10, label: "ST", x: 100, y: 75 },
      { slotOrder: 11, label: "ST", x: 200, y: 75 },
    ],
  },
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { slotOrder: 1, label: "GK", x: 150, y: 400 },
      { slotOrder: 2, label: "LB", x: 50, y: 320 },
      { slotOrder: 3, label: "CB", x: 117, y: 320 },
      { slotOrder: 4, label: "CB", x: 183, y: 320 },
      { slotOrder: 5, label: "RB", x: 250, y: 320 },
      { slotOrder: 6, label: "LCM", x: 75, y: 210 },
      { slotOrder: 7, label: "CM", x: 150, y: 210 },
      { slotOrder: 8, label: "RCM", x: 225, y: 210 },
      { slotOrder: 9, label: "LW", x: 75, y: 110 },
      { slotOrder: 10, label: "CF", x: 150, y: 110 },
      { slotOrder: 11, label: "RW", x: 225, y: 110 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { slotOrder: 1, label: "GK", x: 150, y: 400 },
      { slotOrder: 2, label: "LB", x: 50, y: 320 },
      { slotOrder: 3, label: "CB", x: 117, y: 320 },
      { slotOrder: 4, label: "CB", x: 183, y: 320 },
      { slotOrder: 5, label: "RB", x: 250, y: 320 },
      { slotOrder: 6, label: "CDM", x: 117, y: 240 },
      { slotOrder: 7, label: "CDM", x: 183, y: 240 },
      { slotOrder: 8, label: "LAM", x: 50, y: 155 },
      { slotOrder: 9, label: "CAM", x: 150, y: 155 },
      { slotOrder: 10, label: "RAM", x: 250, y: 155 },
      { slotOrder: 11, label: "ST", x: 150, y: 75 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { slotOrder: 1, label: "GK", x: 150, y: 400 },
      { slotOrder: 2, label: "LCB", x: 75, y: 320 },
      { slotOrder: 3, label: "CB", x: 150, y: 320 },
      { slotOrder: 4, label: "RCB", x: 225, y: 320 },
      { slotOrder: 5, label: "LWB", x: 30, y: 215 },
      { slotOrder: 6, label: "LCM", x: 100, y: 215 },
      { slotOrder: 7, label: "CM", x: 150, y: 215 },
      { slotOrder: 8, label: "RCM", x: 200, y: 215 },
      { slotOrder: 9, label: "RWB", x: 270, y: 215 },
      { slotOrder: 10, label: "ST", x: 100, y: 100 },
      { slotOrder: 11, label: "ST", x: 200, y: 100 },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { slotOrder: 1, label: "GK", x: 150, y: 400 },
      { slotOrder: 2, label: "LCB", x: 75, y: 320 },
      { slotOrder: 3, label: "CB", x: 150, y: 320 },
      { slotOrder: 4, label: "RCB", x: 225, y: 320 },
      { slotOrder: 5, label: "LM", x: 50, y: 220 },
      { slotOrder: 6, label: "LCM", x: 117, y: 220 },
      { slotOrder: 7, label: "RCM", x: 183, y: 220 },
      { slotOrder: 8, label: "RM", x: 250, y: 220 },
      { slotOrder: 9, label: "LW", x: 75, y: 110 },
      { slotOrder: 10, label: "CF", x: 150, y: 110 },
      { slotOrder: 11, label: "RW", x: 225, y: 110 },
    ],
  },
];

export const FORMATION_IDS = [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
] as const;

export type FormationId = (typeof FORMATION_IDS)[number];

export const DEFAULT_FORMATION: FormationId = "4-4-2";

export function getFormation(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}
