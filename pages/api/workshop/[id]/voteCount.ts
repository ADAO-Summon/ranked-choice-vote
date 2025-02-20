// pages/api/votes/[workshopId].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prismaClient'
import { Vote } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'Invalid workshopId' });
    }

    try {
        // Fetch all votes for the workshop
        const votes: Vote[] = await prisma.vote.findMany({
            where: { workshopId:id },
            orderBy: { createdAt: 'desc' },
        });

        // Get the latest vote for each user
        const latestVotes = new Map<string, Vote>();
        votes.forEach(vote => {
            if (!latestVotes.has(vote.userId)) {
                latestVotes.set(vote.userId, vote);
            }
        });
        const voteCount = latestVotes.size;
        
        res.status(200).json({voteCount});

    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({ message: 'Error fetching votes' });
    }
}