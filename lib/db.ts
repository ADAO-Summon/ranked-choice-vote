import prisma from '@/lib/prismaClient'
import TiebreakRoundState from './tiebreakRoundState';

export async function getTiebreakCandidates(workshopId: string) {
  const workshop = await prisma.workshop.findUnique({
    where: { id: workshopId },
    select: { nextTiebreakRank: true }
  });

  if (!workshop) {
    throw new Error('Workshop not found');
  }

  const tiebreakRound = await prisma.tiebreakRound.findFirst({
    where: {
      workshopId,
      tbfplace: workshop.nextTiebreakRank!,
      status: TiebreakRoundState.Started
    },
    select: {
      tbfplace: true,
      candidates: true
    }
  });

  if (!tiebreakRound) {
    return null;
  }

  return {
    tbfplace: tiebreakRound.tbfplace,
    candidates: tiebreakRound.candidates
  };
}