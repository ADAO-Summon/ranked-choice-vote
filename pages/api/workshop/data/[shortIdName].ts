// pages/api/workshop/[id].ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'
import { TiebreakRound } from '@prisma/client'
import { TiebreakRoundStatus } from '@/lib/tiebreakRoundState'
import { WorkshopStatus } from '@/lib/workshopState'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { shortIdName } = req.query

  if (typeof shortIdName !== 'string') {
    return res.status(400).json({ message: 'Invalid workshop ID' })
  }

  const session = await getServerSession(req, res, authOptions)
  const userEmail = session?.user?.email

  if (!userEmail) return res.status(403).json({ message: 'Unauthorized' })

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { shortIdName },
      select: {
        id: true,
        readableName: true,
        adminEmail: true,
        status: true,
        registration: {
          where: {
            candidate: true
          }
        },
        secondaryAdminEmail: true,
        TiebreakRound: {
          orderBy: {
            tbfplace: "asc"
          }
        }
      }
    })

    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' })
    }

    let candidates: { userId: string, name: string }[] = []

    if (workshop.registration && workshop.registration.length > 0) {
      candidates = workshop.registration.map(r => {
        return {
          name: r.candidateName,
          userId: r.userId
        }
      })
    }

    const isAdmin = userEmail === workshop.adminEmail || userEmail === workshop.secondaryAdminEmail

    const { adminEmail, secondaryAdminEmail, ...workshopData } = workshop

    const data = {
      ...workshopData,
      candidates,
      isAdmin,
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Error fetching workshop:', error)
    res.status(500).json({ message: 'Error fetching workshop' })
  }
}

export type WorkshopDataRes = {
  candidates: {
    userId: string;
    name: string;
  }[];
  isAdmin: boolean;
  id: string;
  readableName: string;
  status: WorkshopStatus;
  registration: {
    id: string;
    codeId: string;
    workshopId: string;
    userId: string;
    candidate: boolean;
    candidateName: string;
    registeredAt: Date;
  }[];
  TiebreakRound: {
    id: string;
    workshopId: string;
    tbfplace: number;
    candidates: string[];
    status: TiebreakRoundStatus;
  }[]
}