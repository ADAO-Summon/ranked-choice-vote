// pages/api/user/update-web3-auth-address.ts

import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import prisma from '@/lib/prismaClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { web3AuthAddress } = req.body

  if (!web3AuthAddress) {
    return res.status(400).json({ message: 'Web3 auth address is required' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.web3AuthAddress === web3AuthAddress) {
      return res.status(200).json({ message: 'Web3 auth address is already up to date' })
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { web3AuthAddress },
    })

    res.status(200).json({ message: 'Web3 auth address updated successfully', user: updatedUser })
  } catch (error) {
    console.error('Error updating web3 auth address:', error)
    res.status(500).json({ message: 'Error updating web3 auth address' })
  }
}