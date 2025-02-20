import { NextApiRequest, NextApiResponse } from "next"
import { getToken } from "next-auth/jwt"

const secret = process.env.SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // if using `NEXTAUTH_SECRET` env variable, we detect it, and you won't actually need to `secret`
  // const token = await getToken({ req })
  const token = await getToken({ req, secret, raw: true, secureCookie: process.env.LOCAL !== 'true'})
  res.send({token})
}