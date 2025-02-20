// pages/api/workshop/register.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'
import WorkshopState from '@/lib/workshopState'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { registrationCode, candidateName, candidate } = req.body

  if (!registrationCode) {
    return res.status(400).json({ message: 'Registration code is required' })
  }

  try {
    const code = await prisma.registrationCode.findUnique({
      where: { code: registrationCode },
      include: { workshop: true, registration: true },
    })

    if (!code) {
      return res.status(404).json({ message: 'Invalid registration code' })
    }

    if (code.registration) {
      return res.status(400).json({ message: 'This code has already been used' })
    }

    if(code.workshop.status !== WorkshopState.RegistrationStarted) {
      return res.status(400).json({message: "Registration not active"})
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    let uniqueName = candidateName
    if(uniqueName === "") {
      uniqueName = getEmailPrefix(session.user.email)
    }

    const registration = await prisma.registration.create({
      data: {
        workshopId: code.workshop.id,
        candidate: !!candidate,
        candidateName: uniqueName,
        userId: user.id,
        codeId: code.id,
      },
    })

    res.status(200).json({ message: 'Successfully registered for workshop', registration })
  } catch (error) {
    console.error('Error registering for workshop:', error)
    res.status(500).json({ message: 'Error registering for workshop' })
  }
}

function getEmailPrefix(email: string) {
  // Extract the part before "@"
  const prefix = email.split('@')[0];
  
  // Remove all special characters, keeping only letters and numbers
  return prefix.replace(/[^a-zA-Z0-9]/g, '');
}

