import calculateVoteResults, { calculateTiebreakVoteResults } from '@/lib/determineResults'
import prismaClient from '@/lib/prismaClient'
import TiebreakRoundState from '@/lib/tiebreakRoundState'
import WorkshopState, { WorkshopStatus } from '@/lib/workshopState'
import { TiebreakRound, TiebreakVoteResult, Vote, VoteResult, Workshop } from '@prisma/client'

type TiebreakVoteResultWithRound = TiebreakVoteResult & {
  TiebreakRound: Pick<TiebreakRound, 'tbfplace' | 'index'>;
};


// 1. Start Registration
export async function startRegistration(workshopId: string, prisma = prismaClient) {
  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.RegistrationStarted },
  })
}

// 2. End Registration
export async function endRegistration(workshopId: string, prisma = prismaClient) {
  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.RegistrationEnded },
  })
}

async function getWorkshop(workshopId: string, prisma = prismaClient) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { id: true, status: true, nextTiebreakRank: true }
  });

  if (!workshop) throw new Error('Workshop not found');
  return workshop;
}

// async function calculateTiebreakRoundResults(workshopId: string, tbfplace: number, prisma = prismaClient): Promise<{ tieResolved: boolean }> {
//   const tiebreakResults = await prisma.tiebreakVoteResult.findMany({
//     where: { workshopId, tbfplace },
//     orderBy: { points: 'desc' }
//   });

//   if (tiebreakResults.length <= 1) {
//     return { tieResolved: true };
//   }

//   if (tiebreakResults[0].points > tiebreakResults[1].points) {
//     return { tieResolved: true };
//   }

//   if (tiebreakResults.length === 2) {
//     // Resolve 2-way tie with a coin flip
//     const winner = Math.random() < 0.5 ? tiebreakResults[0] : tiebreakResults[1];
//     await prisma.tiebreakVoteResult.update({
//       where: { id: winner.id },
//       data: { points: winner.points + 0.1 }
//     });
//     return { tieResolved: true };
//   }

//   // If there are more than 2 candidates tied, we don't resolve it here
//   return { tieResolved: false };
// }

export async function endTiebreakVoting(workshopId: string, prisma = prismaClient): Promise<{
  updatedRound: TiebreakRound,
  workshop: Workshop
}> {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true }
  });

  if (!workshop) throw new Error('Workshop not found');

  if (workshop.status !== WorkshopState.TiebreakVoteStarted) {
    throw new Error('Workshop is not in the correct state to end a tiebreak round');
  }

  const currentRound = await getCurrentTiebreakRound(workshopId, prisma);

  if (!currentRound || currentRound.status !== TiebreakRoundState.Started) {
    throw new Error('No active tiebreak round found for this workshop');
  }

  // End the current tiebreak round
  const updatedRound = await prisma.tiebreakRound.update({
    where: { id: currentRound.id },
    data: { status: TiebreakRoundState.Ended }
  });

  // Check if this was the last tiebreak round
  const remainingRounds = await prisma.tiebreakRound.count({
    where: {
      workshopId,
      status: {
        in: [TiebreakRoundState.Initial, TiebreakRoundState.Started]
      }
    }
  });

  const updatedWorkshop = await prisma.workshop.update({
    where: { id: workshopId },
    data: {
      status: remainingRounds === 0 ? WorkshopState.TiebreakVoteEnded : WorkshopState.TiebreakVoteStarted,
    }
  });

  return { updatedRound, workshop: updatedWorkshop };
}


async function handleResolvedTies(workshopId: string, prisma = prismaClient): Promise<WorkshopStatus> {
  const nextTiebreakRound = await prisma.tiebreakRound.findFirst({
    where: {
      workshopId,
      status: TiebreakRoundState.Initial
    },
    orderBy: [
      { tbfplace: 'asc' },
      { index: 'asc' }
    ]
  });

  return nextTiebreakRound
    ? WorkshopState.TiebreakVoteStarted
    : WorkshopState.TiebreakVoteFinalized;
}

export async function getCurrentTiebreakStatus(workshopId: string, prisma = prismaClient) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true }
  });

  if (!workshop) throw new Error('Workshop not found');

  const tiebreakRound = await prisma.tiebreakRound.findFirst({
    where: {
      workshopId,
      status: { in: [TiebreakRoundState.Initial, TiebreakRoundState.Started] }
    },
    orderBy: [
      { tbfplace: 'asc' },
      { index: 'desc' }
    ],
    select: { id: true, candidates: true, status: true, tbfplace: true, index: true }
  });

  return {
    status: workshop.status,
    currentTiebreakRound: tiebreakRound
      ? {
        id: tiebreakRound.id,
        tbfplace: tiebreakRound.tbfplace,
        index: tiebreakRound.index,
        candidates: tiebreakRound.candidates,
        status: tiebreakRound.status
      }
      : null
  };
}
async function getCurrentTiebreakRound(workshopId: string, prisma = prismaClient): Promise<TiebreakRound | null> {
  return prisma.tiebreakRound.findFirst({
    where: {
      workshopId,
      status: {
        in: [TiebreakRoundState.Initial, TiebreakRoundState.Started]
      }
    },
    orderBy: [
      { tbfplace: 'asc' },
      { index: 'asc' }
    ]
  });
}



export async function startTiebreakVoting(workshopId: string, prisma = prismaClient) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true }
  });

  if (!workshop) throw new Error('Workshop not found');

  if (workshop.status !== WorkshopState.TiebreakVoteNeeded && workshop.status !== WorkshopState.TiebreakVoteStarted) {
    throw new Error('Workshop is not in the correct state to start tiebreak voting');
  }

  const currentRound = await getCurrentTiebreakRound(workshopId, prisma);

  if (!currentRound) {
    throw new Error('No tiebreak rounds found');
  }

  if (currentRound.candidates.length < 2) {
    throw new Error('Not enough tied candidates to start a tiebreak vote');
  }

  const updatedWorkshop = await prisma.workshop.update({
    where: { id: workshopId },
    data: {
      status: WorkshopState.TiebreakVoteStarted,
    },
  });

  const updatedRound = await prisma.tiebreakRound.update({
    where: {
      id: currentRound.id,
    },
    data: {
      status: TiebreakRoundState.Started
    }
  });

  return { updatedWorkshop, tiebreakRound: updatedRound };
}


export async function resetTiebreakVoting(workshopId: string, prisma = prismaClient) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true }
  });

  if (!workshop) throw 'Workshop not found';

  if (workshop.status !== WorkshopState.TiebreakVoteStarted &&
    workshop.status !== WorkshopState.TiebreakVoteEnded) {
    throw 'Not allowed to reset tiebreak voting right now';
  }

  const currentRound = await getCurrentTiebreakRound(workshopId, prisma);

  if (!currentRound) throw 'No active tiebreak round found';

  // Backup and delete votes for the current tiebreak round
  const votes = await prisma.tiebreakVote.findMany({
    where: { workshopId, tiebreakRoundId: currentRound.id },
  });

  await prisma.tiebreakBackupVotes.createMany({
    data: votes.map(vote => ({
      ...vote,
      id: undefined,
    })),
  });

  await prisma.tiebreakVote.deleteMany({
    where: { workshopId, tiebreakRoundId: currentRound.id },
  });

  // Delete tiebreak results for the current tiebreak round
  await prisma.tiebreakVoteResult.deleteMany({
    where: { workshopId, tiebreakRoundId: currentRound.id },
  });

  // Reset the current tiebreak round status
  await prisma.tiebreakRound.update({
    where: { id: currentRound.id },
    data: { status: TiebreakRoundState.Initial }
  });

  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.TiebreakVoteNeeded },
  });
}




export async function finalizeVoting(workshopId: string, prisma = prismaClient): Promise<FinalizeVotingOutput> {
  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      select: { status: true }
    });

    if (!workshop) throw new Error('Workshop not found');
    if (workshop.status !== WorkshopState.VoteEnded) {
      throw new Error('Workshop is not in the correct state for finalizing voting');
    }

    // Calculate initial vote results
    const initialResults = await calculateInitialVoteResults(workshopId, prisma);

    // Assign ranks and identify ties
    const { rankedResults, tiebreakRounds } = assignRanksAndIdentifyTies(initialResults);

    // Store vote results
    const storedResults = await storeVoteResults(workshopId, rankedResults, prisma);

    const filteredRounds = tiebreakRounds.filter(x=> x.tbfplace <= 5)

    // Create tiebreak rounds if needed
    if (filteredRounds.length > 0) {
      await createTiebreakRounds(workshopId, filteredRounds, prisma);
    }

    // Update workshop status
    const updatedWorkshop = await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        status: filteredRounds.length > 0 ? WorkshopState.TiebreakVoteNeeded : WorkshopState.VoteFinalized,
      }
    });

    return { updatedWorkshop, voteResults: storedResults, tiebreakRounds };
  } catch (error) {
    console.error('Error finalizing voting:', error);
    throw error;
  }
}

// async function calculateInitialVoteResults(workshopId: string, prisma = prismaClient): Promise<InitialVoteResult[]> {
//   // Implement the logic to calculate initial vote results
//   // This is a placeholder implementation. Adjust according to your actual data model and requirements.
//   const results = await prisma.vote.groupBy({
//     by: ['candidateId'],
//     where: { workshopId },
//     _sum: { points: true },
//   });

//   return results.map(result => ({
//     candidateId: result.candidateId,
//     points: result._sum.points || 0,
//   }));
// }
interface FinalizeVotingOutput {
  updatedWorkshop: Workshop;
  voteResults: VoteResult[];
  tiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[];
}

interface RankedResult {
  candidateName: string;
  points: number;
  rank: number;
}

function assignRanksAndIdentifyTies(initialResults: CandidateResult[]): {
  rankedResults: RankedResult[];
  tiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[];
} {
  const rankedResults: RankedResult[] = [];
  const tiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[] = [];

  let currentRank = 1;
  let currentPoints = -1;
  let tiedCandidates: string[] = [];

  initialResults.forEach((result, index) => {
    if (result.points !== currentPoints) {
      // Handle any existing ties before moving to the next rank
      if (tiedCandidates.length > 1) {
        tiebreakRounds.push({
          tbfplace: currentRank,
          index: 0,  // Initial index for the first tiebreak round
          candidates: [...tiedCandidates]
        });
      }

      currentRank = index + 1;
      currentPoints = result.points;
      tiedCandidates = [result.candidateName];
    } else {
      tiedCandidates.push(result.candidateName);
    }

    rankedResults.push({
      candidateName: result.candidateName,
      points: result.points,
      rank: currentRank
    });
  });

  // Handle any remaining ties
  if (tiedCandidates.length > 1) {
    tiebreakRounds.push({
      tbfplace: currentRank,
      index: 0,  // Initial index for the first tiebreak round
      candidates: [...tiedCandidates]
    });
  }

  return { rankedResults, tiebreakRounds };
}

async function storeVoteResults(workshopId: string, rankedResults: RankedResult[], prisma = prismaClient): Promise<VoteResult[]> {
  // Store or update vote results
  const storedResults = await Promise.all(rankedResults.map(async result => {
    const registration = await prisma.registration.findFirst({
      where: { workshopId, candidateName: result.candidateName }
    });

    if (!registration) {
      throw new Error(`Registration not found for candidate: ${result.candidateName}`);
    }

    return prisma.voteResult.upsert({
      where: {
        workshopId_registrationId: {
          workshopId,
          registrationId: registration.id
        }
      },
      update: { points: result.points, rank: result.rank },
      create: {
        workshopId,
        registrationId: registration.id,
        points: result.points,
        rank: result.rank
      }
    });
  }));

  return storedResults;
}

async function createTiebreakRounds(
  workshopId: string,
  tiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[],
  prisma = prismaClient
) {
  await prisma.tiebreakRound.createMany({
    data: tiebreakRounds.map(round => ({
      workshopId,
      tbfplace: round.tbfplace,
      index: round.index,
      candidates: round.candidates,
      status: TiebreakRoundState.Initial
    }))
  });
}
















// 9. Reset Voting
export async function resetVoting(workshopId: string, prisma = prismaClient) {
  const ws = await prisma.workshop.findUnique({
    where: {
      id: workshopId
    },
    select: {
      status: true
    }
  })

  if (!ws) throw 'Workshop not found'

  if (ws.status !== WorkshopState.VoteEnded && ws.status !== WorkshopState.VoteStarted) throw 'Not allowed to reset right now'

  const votes = await prisma.vote.findMany({
    where: { workshopId },
  })

  await prisma.voteBackup.createMany({
    data: votes.map(vote => ({
      ...vote,
      id: undefined,
    })),
  })

  await prisma.vote.deleteMany({
    where: { workshopId },
  })

  await prisma.voteResult.deleteMany({
    where: { workshopId },
  })

  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.RegistrationEnded },
  })
}

export async function getRegistrations(workshopId: string, prisma = prismaClient): Promise<{
  registrationId: string
  candidateName?: string;
  userId: string;
  candidate: boolean;
  email: string
}[]> {
  const regs = await prisma.registration.findMany({
    where: { workshopId },
    include: { user: true }
  })

  return regs.map(r => {
    return {
      candidateName: r.candidateName,
      userId: r.userId,
      registrationId: r.id,
      candidate: r.candidate,
      email: r.user.email!
    }
  })
}

export async function getRegistrationCodes(workshopId: string, count: number = 50, prisma = prismaClient) {
  const registrationCodes = await prisma.registrationCode.findMany({
    where: { workshopId },
    include: {
      registration: {
        select: {
          user: {
            select: { email: true },
          },
        },
      },
    },
    take: count
  });

  return registrationCodes.map((code) => ({
    id: code.id,
    code: code.code,
    usedBy: code.registration?.user.email || null,
  }));
}

interface CandidateResult {
  candidateName: string;
  points: number;
}


async function calculateInitialVoteResults(workshopId: string, prisma = prismaClient): Promise<CandidateResult[]> {
  // Fetch all votes for the workshop
  const votes = await prisma.vote.findMany({
    where: { workshopId },
    orderBy: { createdAt: 'desc' },
  });

  // Get the latest vote for each user
  const latestVotes = new Map<string, Vote>();
  votes.forEach(vote => {
    if (!latestVotes.has(vote.userId)) {
      latestVotes.set(vote.userId, vote);
    }
  });

  // Fetch all candidate registrations for the workshop
  const registrations = await prisma.registration.findMany({
    where: { workshopId, candidate: true },
    select: { id: true, candidateName: true }
  });

  const candidatePoints = new Map<string, number>();
  registrations.forEach(reg => candidatePoints.set(reg.candidateName, 0));

  // Calculate points for each candidate
  latestVotes.forEach(vote => {
    const addPoints = (selection: string, points: number) => {
      if (candidatePoints.has(selection)) {
        candidatePoints.set(selection, (candidatePoints.get(selection) || 0) + points);
      }
    };

    addPoints(vote.selection1, 5);
    addPoints(vote.selection2, 4);
    addPoints(vote.selection3, 3);
    addPoints(vote.selection4, 2);
    addPoints(vote.selection5, 1);
  });

  // Convert the results to the required format
  const results: CandidateResult[] = Array.from(candidatePoints.entries()).map(([candidateName, points]) => ({
    candidateName,
    points
  }));

  // Sort results by points in descending order
  return results.sort((a, b) => b.points - a.points);
}

// 6. Start Voting
export async function startVoting(workshopId: string, prisma = prismaClient) {
  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.VoteStarted },
  })
}

// 7. End Voting
export async function endVoting(workshopId: string, prisma = prismaClient) {
  return prisma.workshop.update({
    where: { id: workshopId },
    data: { status: WorkshopState.VoteEnded },
  })
}

















interface FinalizeTiebreakVotingOutput {
  updatedWorkshop: Workshop;
  tieResolved: boolean;
  nextTiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[];
}

export async function finalizeTiebreakVoting(workshopId: string, prisma = prismaClient): Promise<FinalizeTiebreakVotingOutput> {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { status: true }
  });

  if (!workshop) throw new Error('Workshop not found');

  if (workshop.status !== WorkshopState.TiebreakVoteStarted && workshop.status !== WorkshopState.TiebreakVoteEnded) {
    throw new Error('Workshop is not in the correct state for finalizing tiebreak voting');
  }

  const currentRound = await prisma.tiebreakRound.findFirst({
    where: {
      workshopId,
      status: TiebreakRoundState.Ended
    },
    orderBy: [
      { tbfplace: 'asc' },
      { index: 'desc' }
    ]
  });

  if (!currentRound) throw new Error('No ended tiebreak round found');

  // Calculate the results for the current tiebreak round
  const { tieResolved, nextTiebreakRounds, storedResults } = await calculateTiebreakVoteResults(workshopId, currentRound.id, prisma);

  if (!tieResolved) {
    // Handle unresolved ties
    await handleUnresolvedTies(workshopId, currentRound, nextTiebreakRounds, storedResults, prisma);
  }

  // Check for any remaining tiebreak rounds
  const remainingRounds = await prisma.tiebreakRound.count({
    where: {
      workshopId,
      status: {
        in: [TiebreakRoundState.Initial, TiebreakRoundState.Started]
      }
    }
  });

  const newStatus = remainingRounds > 0 ? WorkshopState.TiebreakVoteStarted : WorkshopState.TiebreakVoteFinalized;

  const updatedWorkshop = await prisma.workshop.update({
    where: { id: workshopId },
    data: { status: newStatus }
  });

  // Mark the current tiebreak round as finalized
  await prisma.tiebreakRound.update({
    where: { id: currentRound.id },
    data: { status: TiebreakRoundState.Finalized }
  });

  // Update final VoteResults based on TiebreakVoteResults
  await updateFinalVoteResults(workshopId, prisma);

  return {
    updatedWorkshop,
    tieResolved,
    nextTiebreakRounds
  };
}

async function handleUnresolvedTies(
  workshopId: string,
  currentRound: TiebreakRound,
  nextTiebreakRounds: { tbfplace: number; index: number; candidates: string[] }[],
  storedResults: any[],
  prisma = prismaClient
) {
  for (const round of nextTiebreakRounds) {
    if (round.candidates.length === 2 && currentRound.candidates.length === 2) {
      // If there are exactly two candidates in the round, perform a coinflip
      const winner = await performCoinflip(round.candidates);
      await updateTiebreakVoteResultsForCoinflip(workshopId, currentRound.id, winner, round.candidates, round.tbfplace, prisma);
    } else {
      if (round.tbfplace < 6) {
        // For any other number of candidates, create a new round
        await prisma.tiebreakRound.create({
          data: {
            workshopId,
            tbfplace: round.tbfplace,
            index: round.index,
            candidates: round.candidates,
            status: TiebreakRoundState.Initial
          }
        });
      }
    }
  }

  // Update TiebreakVoteResult for resolved candidates
  const resolvedCandidates = currentRound.candidates.filter(
    c => !nextTiebreakRounds.some(r => r.candidates.includes(c))
  );
  await updateTiebreakVoteResultsForResolvedCandidates(workshopId, resolvedCandidates, currentRound.id, storedResults, prisma);
}

async function performCoinflip(candidates: string[]): Promise<string> {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function updateTiebreakVoteResultsForCoinflip(
  workshopId: string,
  tiebreakRoundId: string,
  winner: string,
  candidates: string[],
  tbfplace: number,
  prisma = prismaClient
) {
  const registrations = await prisma.registration.findMany({
    where: { workshopId, candidateName: { in: candidates } },
    select: { id: true, candidateName: true }
  });

  for (const registration of registrations) {
    const points = registration.candidateName === winner ? 0.01 : 0;

    await prisma.tiebreakVoteResult.upsert({
      where: {
        workshopId_registrationId_tiebreakRoundId: {
          workshopId,
          registrationId: registration.id,
          tiebreakRoundId
        }
      },
      update: {
        points: { increment: points }
      },
      create: {
        workshopId,
        registrationId: registration.id,
        tiebreakRoundId,
        points,
        rank: tbfplace // Use tbfplace for rank in coinflip scenarios
      }
    });
  }
}

async function updateTiebreakVoteResultsForResolvedCandidates(
  workshopId: string,
  resolvedCandidates: string[],
  tiebreakRoundId: string,
  storedResults: any[],
  prisma = prismaClient
) {
  const registrations = await prisma.registration.findMany({
    where: { workshopId, candidateName: { in: resolvedCandidates } },
    select: { id: true, candidateName: true }
  });

  for (const registration of registrations) {
    const result = storedResults.find(r => r.registrationId === registration.id);
    if (!result) continue;

    await prisma.tiebreakVoteResult.upsert({
      where: {
        workshopId_registrationId_tiebreakRoundId: {
          workshopId,
          registrationId: registration.id,
          tiebreakRoundId
        }
      },
      update: {
        points: result.points,
        rank: result.rank
      },
      create: {
        workshopId,
        registrationId: registration.id,
        tiebreakRoundId,
        points: result.points,
        rank: result.rank
      }
    });
  }
}

async function updateFinalVoteResults(workshopId: string, prisma = prismaClient) {
  const voteResults = await prisma.voteResult.findMany({
    where: { workshopId },
    include: {
      Registration: {
        select: {
          candidateName: true,
          id: true
        }
      }
    }
  });

  // Fetch TiebreakVoteResults separately
  const tiebreakResults = await prisma.tiebreakVoteResult.findMany({
    where: {
      workshopId,
      registrationId: { in: voteResults.map(vr => vr.registrationId) }
    },
    include: {
      TiebreakRound: {
        select: { tbfplace: true, index: true }
      }
    }
  });

  // Group tiebreak results by registrationId
  const tiebreakResultsMap = tiebreakResults.reduce((acc, tr) => {
    if (!acc[tr.registrationId]) {
      acc[tr.registrationId] = [];
    }
    acc[tr.registrationId].push(tr);
    return acc;
  }, {} as Record<string, TiebreakVoteResultWithRound[]>);

  // Combine vote results with tiebreak results
  const combinedResults = voteResults.map(vr => ({
    ...vr,
    tiebreakResults: tiebreakResultsMap[vr.registrationId] || []
  }));

  // Sort the combined results
  combinedResults.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    const aTiebreakPoints = a.tiebreakResults.reduce((sum, tr) => sum + tr.points, 0);
    const bTiebreakPoints = b.tiebreakResults.reduce((sum, tr) => sum + tr.points, 0);

    if (aTiebreakPoints !== bTiebreakPoints) {
      return bTiebreakPoints - aTiebreakPoints;
    }

    return 0; // Maintain original order if everything is tied
  });

  // Update ranks
  let currentRank = 1;
  let sameRankCount = 1;

  for (let i = 0; i < combinedResults.length; i++) {
    const result = combinedResults[i];
    const resultTiebreakPoints = result.tiebreakResults.reduce((sum, tr) => sum + tr.points, 0);

    if (i > 0) {
      const prevResult = combinedResults[i - 1];
      const prevTiebreakPoints = prevResult.tiebreakResults.reduce((sum, tr) => sum + tr.points, 0);

      if (result.points !== prevResult.points || resultTiebreakPoints !== prevTiebreakPoints) {
        currentRank += sameRankCount;
        sameRankCount = 1;
      } else {
        sameRankCount++;
      }
    }

    await prisma.voteResult.update({
      where: { id: result.id },
      data: { rank: currentRank }
    });

    console.log(`Updated rank for ${result.Registration.candidateName}: ${currentRank} (Points: ${result.points}, Tiebreak Points: ${resultTiebreakPoints})`);
  }
}