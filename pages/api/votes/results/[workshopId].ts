// pages/api/votes/[workshopId].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
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
        const voteResults = await prisma.voteResult.findMany({
            where: {
                workshopId: workshopId,
            },
            orderBy: {
                points: 'desc',
            },
            include:{
                Registration: true
            }
        });

        res.status(200).json(voteResults);
    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({ message: 'Error fetching votes' });
    }
}