// pages/api/votes/[workshopId].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { workshopId } = req.query;

  if (!workshopId || typeof workshopId !== 'string') {
    return res.status(400).json({ message: 'Invalid workshopId' });
  }

  try {
    const votes = await prisma.tiebreakVote.findMany({
      where: {
        workshopId: workshopId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['userId'],
      select: {
        user: {
          select: {
            email: true,
          },
        },
        stakeAddress: true,
        coseKeyHex: true,
        coseSignatureHex: true,
        message: true,
        selection1: true,
        selection2: true,
        selection3: true,
        selection4: true,
        selection5: true,
        createdAt: true,
        cardanoAddress: true,
        TiebreakRound: {
          select: {
            tbfplace: true,
            index: true,
          },
        },
      },
    });

    const formattedVotes = votes.map((vote) => ({
      email: vote.user.email,
      stakeAddress: vote.stakeAddress,
      cardanoAddress: vote.cardanoAddress,
      coseKeyHex: vote.coseKeyHex,
      coseSignatureHex: vote.coseSignatureHex,
      message: vote.message,
      selection1: vote.selection1,
      selection2: vote.selection2,
      selection3: vote.selection3,
      selection4: vote.selection4,
      selection5: vote.selection5,
      tbfplace: vote.TiebreakRound.tbfplace,
      index: vote.TiebreakRound.index,
    }));

    console.log('Votes:', formattedVotes);

    res.status(200).json(formattedVotes);
  } catch (error) {
    console.error('Error fetching votes:', error);
    res.status(500).json({ message: 'Error fetching votes' });
  }
}