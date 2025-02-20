const TiebreakRoundState = {
  Initial: 0,
  Started: 1,
  Ended: 2,
  Finalized: 3,
} as const

export type TiebreakRoundStatus = typeof TiebreakRoundState[keyof typeof TiebreakRoundState];

export const TiebreakRoundStateDisplayNames = {
  0: "Not Started",
  1: "Started",
  2: "Ended",
  3: "Finalized",
} as const 

export type TiebreakRoundStatusName = typeof TiebreakRoundStateDisplayNames[keyof typeof TiebreakRoundStateDisplayNames];

export function getTiebreakRoundStatusName(status: TiebreakRoundStatus): string {
  return TiebreakRoundStateDisplayNames[status]
}

export default TiebreakRoundState
