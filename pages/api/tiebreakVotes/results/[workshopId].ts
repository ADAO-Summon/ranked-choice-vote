
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '@/lib/prismaClient'
import { TiebreakVote } from '@prisma/client';

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
        const voteResults = await prisma.tiebreakVoteResult.findMany({
            where: {
                workshopId: workshopId,
            },
            orderBy: [
                { TiebreakRound: { tbfplace: 'asc' } },
                { TiebreakRound: { index: 'desc' } },
                { points: 'desc' },
            ],
            include: {
                Registration: true,
                TiebreakRound: {
                    select: { tbfplace: true, index: true }
                }
            }
        });

        // Fetch all votes for the workshop
        const votes = await prisma.tiebreakVote.findMany({
            where: {
                workshopId: workshopId,
            },
            include: {
                TiebreakRound: {
                    select: { tbfplace: true, index: true }
                }
            }
        });

        // Group vote results by tbfplace and index
        const groupedResults = voteResults.reduce((acc, result) => {
            const key = `${result.TiebreakRound.tbfplace}-${result.TiebreakRound.index}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(result);
            return acc;
        }, {} as Record<string, typeof voteResults>);

        const voteResultsWithCount: { voteCount: number; Registration: { id: string; codeId: string; workshopId: string; userId: string; candidate: boolean; candidateName: string; registeredAt: Date; }; TiebreakRound: { tbfplace: number; index: number; }; id: string; workshopId: string; registrationId: string; points: number; rank: number; createdAt: Date; tiebreakRoundId: string; }[] = [];

        for (const [key, results] of Object.entries(groupedResults)) {
            const [tbfplace, index] = key.split('-').map(Number);
            
            // Get the latest votes for this tiebreak round
            const latestVotes = new Map<string, TiebreakVote>();
            votes
                .filter(vote => vote.TiebreakRound.tbfplace === tbfplace && vote.TiebreakRound.index === index)
                .forEach(vote => {
                    if (!latestVotes.has(vote.userId) || vote.createdAt > latestVotes.get(vote.userId)!.createdAt) {
                        latestVotes.set(vote.userId, vote);
                    }
                });

            const voteCount = latestVotes.size;

            results.forEach(result => {
                voteResultsWithCount.push({
                    ...result,
                    voteCount,
                });
            });
        }

        // Sort the final results
        voteResultsWithCount.sort((a, b) => {
            if (a.TiebreakRound.tbfplace !== b.TiebreakRound.tbfplace) {
                return a.TiebreakRound.tbfplace - b.TiebreakRound.tbfplace;
            }
            if (a.TiebreakRound.index !== b.TiebreakRound.index) {
                return b.TiebreakRound.index - a.TiebreakRound.index;
            }
            return b.points - a.points;
        });

        console.log('Vote results:', voteResultsWithCount);

        res.status(200).json(voteResultsWithCount);
    } catch (error) {
        console.error('Error fetching votes:', error);
        res.status(500).json({ message: 'Error fetching votes' });
    }
}