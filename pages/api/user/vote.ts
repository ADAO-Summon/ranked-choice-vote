import prisma from '@/lib/prismaClient'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user?.email) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    if (req.method === 'POST') {
        const { workshopId } = req.body

        const workshop = await prisma.workshop.findUnique({
            where: {
                id: workshopId
            },
            include: {
                votes: {
                    where: {
                        userId: session.user.id
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                TiebreakVote: {
                    where: {
                        userId: session.user.id,
                        TiebreakRound: {
                            status: {
                                not:
                                {
                                    in: [3, 0]
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
            }
        })

        if (!workshop) return res.status(400).json({ message: 'Workshop not found' })

        const lastVote = (workshop.votes && workshop.votes.length > 0) ? workshop.votes[0] : null
        const lastTiebreakVote = (workshop.TiebreakVote && workshop.TiebreakVote.length > 0) ? workshop.TiebreakVote[0] : null

        return res.status(201).json({
            lastVote: lastVote ? {
                selection1: lastVote.selection1,
                selection2: lastVote.selection2,
                selection3: lastVote.selection3,
                selection4: lastVote.selection4,
                selection5: lastVote.selection5,
            } : null, lastTiebreakVote: lastTiebreakVote ? {
                selection1: lastTiebreakVote.selection1,
                selection2: lastTiebreakVote.selection2,
                selection3: lastTiebreakVote.selection3,
                selection4: lastTiebreakVote.selection4,
                selection5: lastTiebreakVote.selection5,
            } : null
        })
    }

    return res.status(405).json({ message: 'Method not allowed' })
}