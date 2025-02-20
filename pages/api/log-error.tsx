// pages/api/log-error.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { message, stack, details, url, userAgent } = req.body

  if (!message) {
    return res.status(400).json({ message: 'Error message is required' })
  }

  try {
    const errorLog = await prisma.errorLog.create({
      data: {
        message,
        stack: stack || null,
        details: details || null,
        url,
        userAgent,
        userId: session?.user?.email || null,
      },
    })

    res.status(200).json({ message: 'Error logged successfully', errorLog })
  } catch (loggingError) {
    console.error('Error logging frontend error:', loggingError)
    res.status(500).json({ message: 'Error logging frontend error' })
  }
}