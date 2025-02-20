import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    const datetime = Date.now()
    res.json({ datetime });
}