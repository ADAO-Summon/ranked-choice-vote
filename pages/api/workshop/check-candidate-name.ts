import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { registrationCode, candidateName } = req.query

  if (!registrationCode || !candidateName) {
    return res.status(400).json({ message: 'Missing required parameters' })
  }

  try {
    const registrationCodeRecord = await prisma.registrationCode.findUnique({
      where: {
        code: registrationCode as string,
      },
      select: {
        workshopId: true,
      },
    })

    if (!registrationCodeRecord) {
      return res.status(404).json({ message: 'Invalid registration code' })
    }

    const { workshopId } = registrationCodeRecord

    const existingRegistration = await prisma.registration.findFirst({
      where: {
        workshopId: workshopId,
        candidateName: candidateName as string,
      },
    })

    const isAvailable = !existingRegistration

    res.status(200).json(isAvailable)
  } catch (error) {
    console.error('Error checking candidate name:', error)
    res.status(500).json({ message: 'Error checking candidate name' })
  } finally {
    await prisma.$disconnect()
  }
}