// pages/api/workshop/[id].ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { workshopId } = req.query

  if (typeof workshopId !== 'string') {
    return res.status(400).json({ message: 'Invalid workshop ID' })
  }

  const session = await getServerSession(req, res, authOptions)
  const userEmail = session?.user?.email

  if(!userEmail) return res.status(403).json({message: 'Unauthorized'})

  try {
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      select: {
        id: true,
        readableName: true,
        adminEmail: true,
        status: true,
        registration: {
            where: {
                candidate: true
            }
        }
      },
    })

    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found' })
    }

    if(!workshop.registration || workshop.registration.length < 1) {
        return res.status(200).json({candidates: []})
    }

    const candidates =  workshop.registration.map(r => {
        return {
            name: r.candidateName,
            userId: r.userId
        }
    })

    res.status(200).json({
      candidates,
    })
  } catch (error) {
    console.error('Error fetching workshop:', error)
    res.status(500).json({ message: 'Error fetching workshop' })
  }
}