// pages/api/user/workshops.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const userWorkshops = await prisma.registration.findMany({
      where: {
        user: { email: session.user.email },
      },
      select: {
        workshop: {
          select: {
            id: true,
            readableName: true,
            shortIdName: true,
            status: true,
            votes: {
              where: {
                user: { email: session.user.email }
              },
              select: {
                id: true,
              },
            },
            TiebreakVote: {
              where: {
                user: { email: session.user.email }
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    const organizingWorkshops = await prisma.workshop.findMany({
      where: {
        OR: [
          {
            adminEmail: session.user.email,
          },
          {
            secondaryAdminEmail: session.user.email
          }
        ],
        id: {
          notIn: userWorkshops.map(r => r.workshop.id)
        }
      },
      select: {
        id: true,
        readableName: true,
        shortIdName: true,
        status: true,
        votes: {
          where: {
            user: { email: session.user.email }
          },
          select: {
            id: true,
          },
        },
        TiebreakVote: {
          where: {
            user: { email: session.user.email }
          },
          select: {
            id: true,
          },
        },
      },
    })

    const allWorkshops = userWorkshops.concat(organizingWorkshops.map(w => { return { workshop: w } }))

    const formattedWorkshops = allWorkshops.map(({ workshop }) => ({
      id: workshop.id,
      readableName: workshop.readableName,
      shortIdName: workshop.shortIdName,
      status: workshop.status,
    }))

    res.status(200).json(formattedWorkshops)
  } catch (error) {
    console.error('Error fetching user workshops:', error)
    res.status(500).json({ message: 'Error fetching user workshops' })
  }
}

// function getWorkshopStatus(workshop: any) {
//   if (workshop.testVotes.length > 0) return 'test_vote'
//   if (workshop.votes.length > 0) return 'voted'
//   if (workshop.voteActive) return 'in_progress'
//   return 'not_started'
// }