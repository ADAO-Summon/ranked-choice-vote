import prismaClient from './prismaClient'
import WorkshopState from './workshopState';
import { Vote, Registration, VoteResult, Workshop, TiebreakRound, TiebreakVoteResult, TiebreakVote } from '@prisma/client';

interface CandidateVoteCounts {
  [key: string]: number[];
}

interface VoteResultInput {
  registrationId: string;
  points: number;
  rank: number;
  tiebreakCandidate: boolean;
  Registration: {
    candidateName: string;
  };
}

interface CalculateVoteResultsOutput {
  storedResults: (VoteResult | Workshop | TiebreakRound)[];
  tiebreakNeeded: number[];
}

export default async function calculateVoteResults(workshopId: string, prisma = prismaClient): Promise<CalculateVoteResultsOutput> {
  try {
    // Fetch all votes for the workshop
    const votes: Vote[] = await prisma.vote.findMany({
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
    const registrations: Registration[] = await prisma.registration.findMany({
      where: { workshopId, candidate: true },
    });

    const userRegistrationMap = new Map<string, string>(
      registrations.map(reg => [reg.candidateName, reg.id])
    );

    const candidatePoints = new Map<string, number>();
    const candidateVoteCounts: CandidateVoteCounts = {};

    // Calculate points and vote counts for each candidate
    latestVotes.forEach(vote => {
      const addPoints = (selection: string, points: number) => {
        if (selection) {
          const registrationId = userRegistrationMap.get(selection);
          if (registrationId) {
            candidatePoints.set(registrationId, (candidatePoints.get(registrationId) || 0) + points);

            if (!candidateVoteCounts[registrationId]) {
              candidateVoteCounts[registrationId] = [0, 0, 0, 0, 0];
            }
            candidateVoteCounts[registrationId][5 - points]++;
          }
        }
      };

      addPoints(vote.selection1, 5);
      addPoints(vote.selection2, 4);
      addPoints(vote.selection3, 3);
      addPoints(vote.selection4, 2);
      addPoints(vote.selection5, 1);
    });

    // Sort candidates by points
    let sortedCandidates = Array.from(candidatePoints.entries())
      .sort((a, b) => b[1] - a[1]);

    // Apply tiebreak rules
    for (let rank = 1; rank <= 5; rank++) {
      const tiedCandidates = sortedCandidates.filter(([, points], index, arr) =>
        index === 0 || points === arr[0][1]
      );

      if (tiedCandidates.length > 1) {
        const maxVotes = Math.max(...tiedCandidates.map(([id]) => candidateVoteCounts[id][rank - 1]));
        tiedCandidates.forEach(([id, points]) => {
          if (candidateVoteCounts[id][rank - 1] === maxVotes) {
            candidatePoints.set(id, points + (0.5 - (rank - 1) * 0.1));
          }
        });

        // Re-sort candidates after applying tiebreak points
        sortedCandidates = Array.from(candidatePoints.entries())
          .sort((a, b) => b[1] - a[1]);
      } else {
        break; // No more ties to resolve
      }
    }

    let currentRank = 1;
    const voteResults: VoteResultInput[] = [];
    let tiebreakNeeded = false;

    for (let i = 0; i < sortedCandidates.length; i++) {
      const [registrationId, points] = sortedCandidates[i];
      if (currentRank > 5) break; // Stop after 5th place

      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: { candidateName: true }
      });

      if (!registration) {
        throw new Error(`Registration not found for id: ${registrationId}`);
      }

      const voteResult: VoteResultInput = {
        registrationId,
        points,
        rank: currentRank,
        tiebreakCandidate: false,
        Registration: registration
      };

      voteResults.push(voteResult);

      // Check for ties
      if (i < sortedCandidates.length - 1 && points === sortedCandidates[i + 1][1]) {
        voteResult.tiebreakCandidate = true;
        tiebreakNeeded = true;
      } else {
        currentRank++;
      }
    }

    // Store the results
    const storedResults = await prisma.$transaction([
      ...voteResults.map(result =>
        prisma.voteResult.upsert({
          where: {
            workshopId_registrationId: {
              workshopId,
              registrationId: result.registrationId,
            },
          },
          update: {
            points: result.points,
            rank: result.rank,
            tiebreakCandidate: result.tiebreakCandidate
          },
          create: {
            workshopId,
            registrationId: result.registrationId,
            points: result.points,
            rank: result.rank,
            tiebreakCandidate: result.tiebreakCandidate
          },
        })
      ),
      prisma.workshop.update({
        where: { id: workshopId },
        data: {
          status: tiebreakNeeded ? WorkshopState.TiebreakVoteNeeded : WorkshopState.VoteFinalized,
          nextTiebreakRank: tiebreakNeeded ? Math.min(...voteResults.filter(r => r.tiebreakCandidate).map(r => r.rank)) : null
        }
      })
    ]);

    return {
      storedResults,
      tiebreakNeeded: tiebreakNeeded ? [Math.min(...voteResults.filter(r => r.tiebreakCandidate).map(r => r.rank))] : []
    };
  } catch (error) {
    console.error('Error calculating vote results:', error);
    throw error;
  }
}


interface CalculateTiebreakVoteResultsOutput {
  tieResolved: boolean;
  nextTiebreakRounds: { tbfplace: number, index: number, candidates: string[] }[];
  storedResults: TiebreakVoteResult[];
}

interface CandidateScore {
  candidateName: string;
  points: number;
}

export async function calculateTiebreakVoteResults(
  workshopId: string, 
  tiebreakRoundId: string, 
  prisma = prismaClient
): Promise<CalculateTiebreakVoteResultsOutput> {
  try {
    const tiebreakRound = await getTiebreakRound(tiebreakRoundId, prisma);
    const tiebreakVotes = await getTiebreakVotes(workshopId, tiebreakRoundId, prisma);
    const candidateScores = calculateCandidateScores(tiebreakRound.candidates, tiebreakVotes);
    const sortedCandidates = candidateScores.sort((a, b) => b.points - a.points);

    const { tieResolved, nextTiebreakRounds } = identifyTiesAndCreateRounds(sortedCandidates, tiebreakRound.tbfplace, tiebreakRound.index);
    
    const registrations = await getRegistrations(workshopId, sortedCandidates.map(c => c.candidateName), prisma);
    const storedResults = await upsertTiebreakResults(workshopId, sortedCandidates, registrations, tiebreakRoundId, prisma);
    
    await updateVoteResults(workshopId, sortedCandidates, registrations, tiebreakRound.tbfplace, prisma);

    return { tieResolved, nextTiebreakRounds, storedResults };
  } catch (error) {
    console.error('Error calculating tiebreak vote results:', error);
    throw error;
  }
}

async function getTiebreakRound(tiebreakRoundId: string, prisma = prismaClient) {
  const round = await prisma.tiebreakRound.findUnique({
    where: { id: tiebreakRoundId },
    select: { candidates: true, tbfplace: true, index: true }
  });

  if (!round) throw new Error(`Tiebreak round not found for id: ${tiebreakRoundId}`);
  return round;
}

async function getTiebreakVotes(workshopId: string, tiebreakRoundId: string, prisma = prismaClient) {
  const votes = await prisma.tiebreakVote.findMany({
    where: { workshopId, tiebreakRoundId },
    orderBy: { createdAt: 'desc' },
  });

  const latestVotes = new Map<string, TiebreakVote>();
  votes.forEach(vote => {
    if (!latestVotes.has(vote.userId)) {
      latestVotes.set(vote.userId, vote);
    }
  });

  return Array.from(latestVotes.values());
}

function calculateCandidateScores(candidates: string[], votes: TiebreakVote[]): CandidateScore[] {
  const scores = new Map(candidates.map(c => [c, 0]));

  votes.forEach(vote => {
    const addPoints = (selection: string, points: number) => {
      if (scores.has(selection)) {
        scores.set(selection, scores.get(selection)! + points);
      }
    };

    addPoints(vote.selection1, 5);
    addPoints(vote.selection2, 4);
    addPoints(vote.selection3, 3);
    addPoints(vote.selection4, 2);
    addPoints(vote.selection5, 1);
  });

  return Array.from(scores, ([candidateName, points]) => ({ candidateName, points }));
}

function identifyTiesAndCreateRounds(sortedCandidates: CandidateScore[], tbfplace: number, currentIndex: number) {
  let tieResolved = true;
  const nextTiebreakRounds: { tbfplace: number, index: number, candidates: string[] }[] = [];
  let currentRank = tbfplace;
  let tiedCandidates: string[] = [];

  sortedCandidates.forEach((candidate, index) => {
    if (index === 0 || candidate.points === sortedCandidates[index - 1].points) {
      tiedCandidates.push(candidate.candidateName);
    } else {
      if (tiedCandidates.length > 1) {
        nextTiebreakRounds.push({ tbfplace: currentRank, index: currentIndex + 1, candidates: tiedCandidates });
        tieResolved = false;
      }
      currentRank += tiedCandidates.length;
      tiedCandidates = [candidate.candidateName];
    }
  });

  if (tiedCandidates.length > 1) {
    nextTiebreakRounds.push({ tbfplace: currentRank, index: currentIndex + 1, candidates: tiedCandidates });
    tieResolved = false;
  }

  return { tieResolved, nextTiebreakRounds };
}

async function getRegistrations(workshopId: string, candidateNames: string[], prisma = prismaClient) {
  return await prisma.registration.findMany({
    where: { workshopId, candidateName: { in: candidateNames } },
    select: { id: true, candidateName: true }
  });
}

async function upsertTiebreakResults(
  workshopId: string, 
  sortedCandidates: CandidateScore[], 
  registrations: Pick<Registration, 'id' | 'candidateName'>[], 
  tiebreakRoundId: string, 
  prisma = prismaClient
) {
  const candidateNameToRegistrationId = new Map(registrations.map(reg => [reg.candidateName, reg.id]));

  return await Promise.all(
    sortedCandidates.map(async ({ candidateName, points }, index) => {
      const registrationId = candidateNameToRegistrationId.get(candidateName);
      if (!registrationId) {
        throw new Error(`Registration not found for candidate: ${candidateName}`);
      }
      return prisma.tiebreakVoteResult.upsert({
        where: {
          workshopId_registrationId_tiebreakRoundId: {
            workshopId,
            registrationId,
            tiebreakRoundId
          }
        },
        update: {
          points,
          rank: index + 1
        },
        create: {
          workshopId,
          registrationId,
          tiebreakRoundId,
          points,
          rank: index + 1
        }
      });
    })
  );
}

async function updateVoteResults(
  workshopId: string, 
  sortedCandidates: CandidateScore[], 
  registrations: Pick<Registration, 'id' | 'candidateName'>[], 
  tbfplace: number, 
  prisma = prismaClient
) {
  const candidateNameToRegistrationId = new Map(registrations.map(reg => [reg.candidateName, reg.id]));

  await Promise.all(sortedCandidates.map(async ({ candidateName }, index) => {
    const registrationId = candidateNameToRegistrationId.get(candidateName);
    if (!registrationId) {
      throw new Error(`Registration not found for candidate: ${candidateName}`);
    }
    return prisma.voteResult.update({
      where: {
        workshopId_registrationId: {
          workshopId,
          registrationId
        }
      },
      data: {
        rank: tbfplace + index,
      }
    });
  }));
}