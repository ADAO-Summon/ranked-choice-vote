import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

const workshopId = 'clz6cn1lu0000srs81u5dsqpr' // BETA WORKSHOP ID

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {

    const rcCount = await prisma.registrationCode.count({
      where: { workshopId, registration: null },
    })

    if (rcCount === 0) {
      throw 'No free tokens'; 
    }

    const randomSkip = Math.floor(Math.random() * rcCount);

    const randomRc = await prisma.registrationCode.findFirst({
      where: { workshopId, registration: null },
      skip: randomSkip,
    });

    if (!randomRc) throw 'No free tokens'; 

    res.status(200).json({ code: randomRc.code })
  } catch (error) {
    console.error('Error fetching user workshops:', error)
    res.status(500).json({ message: `Error fetching user workshops: ${error}` })
  }
}

