const WorkshopState = {
  Initial: 0,
  RegistrationStarted: 1,
  RegistrationEnded: 2,
  VoteStarted: 3,
  VoteEnded: 4,
  VoteFinalized: 5,
  TiebreakVoteNeeded: 6,
  TiebreakVoteStarted: 7,
  TiebreakVoteEnded: 8,
  TiebreakVoteFinalized: 9
} as const

export type WorkshopStatus = typeof WorkshopState[keyof typeof WorkshopState];

export const WorkshopStateDisplayNames = {
  0: "Not Started",
  1: "Registration Started",
  2: "Registration Ended",
  3: "Vote Started",
  4: "Vote Ended",
  5: "Vote Finalized",
  6: "Tie-Breaker Vote Needed",
  7: "Tie-Breaker Vote Started",
  8: "Tie-Breaker Vote Ended",
  9: "Tie-Breaker Vote Finalized"
} as const 

export type WorkshopStatusName = typeof WorkshopStateDisplayNames[keyof typeof WorkshopStateDisplayNames];

export function getWorkshopStatusName(status: WorkshopStatus): string {
  return WorkshopStateDisplayNames[status]
}

export default WorkshopState
