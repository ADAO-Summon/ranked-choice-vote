import { Blockfrost, Lucid } from "lucid-cardano";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from '@/lib/prismaClient'
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import WorkshopState from "@/lib/workshopState";
import TiebreakRoundState from "@/lib/tiebreakRoundState";


const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-mainnet.blockfrost.io/api/v0/",
        "mainnetVdYNlK3vObFbe7uXxd0sWm4Gl9ejrkSC"
    ),
    "Mainnet"
);

type SignedSurvey = {
    cose_key_hex: string,
    cose_signature_hex: string,
    expected_message: string,
    expected_address: string,
    workshopId: string,
    cardano_address: string
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions)

    if (!session || !session.user) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
        const vr: SignedSurvey = JSON.parse(req.body)
        const {
            cose_key_hex,
            cose_signature_hex,
            expected_message,
            expected_address,
            workshopId,
            cardano_address
        } = vr;

        const registration = await prisma.registration.findUnique({
            where: {
                userId_workshopId: {
                    userId: session.user.id,
                    workshopId: workshopId
                }
            }
        })

        if (!registration) return res.status(405).json({ message: "Not registered for this workshop" })

        const workshop = await prisma.workshop.findUnique({
            where: { id: workshopId },
            select: { status: true, nextTiebreakRank: true }
        })

        if (!workshop) return res.status(405).json({ message: "Workshop not found" })

        const { status, nextTiebreakRank } = workshop

        if (!(status === WorkshopState.VoteStarted || status === WorkshopState.TiebreakVoteStarted)) {
            return res.status(405).json({ message: "Voting is not active" })
        }

        const tiebreakVote = status === WorkshopState.TiebreakVoteStarted

        
        const parsedMessage = JSON.parse(expected_message)
        const expectedTimestamp = parsedMessage.timestamp;
        const signedMessage = {
            signature: cose_signature_hex,
            key: cose_key_hex
        };
        const isValid = !expected_address ? true : lucid.verifyMessage(
            expected_address,
            Buffer.from(expected_message, 'ascii').toString('hex'),
            signedMessage
        );
        if (!isValid || expectedTimestamp > Date.now()) {
            return res.status(400).send({ error: "Invalid Signature" });
        }

        const selectedOptions = (parsedMessage.params as string[])

        if (selectedOptions.length < 1) {
            return res.status(400).send("You have to choose at least 1 option");
        }

        let validCandidates: string[];
    let currentTiebreakRound;

    if (tiebreakVote) {
        // Get the current tiebreak round
        currentTiebreakRound = await prisma.tiebreakRound.findFirst({
            where: {
                workshopId,
                status: TiebreakRoundState.Started, // Assuming you have a status field for tiebreak rounds
            },
            orderBy: [
                { tbfplace: 'asc' },
                { index: 'desc' }
            ],
            select: { id: true, candidates: true, tbfplace: true, index: true }
        });

        if (!currentTiebreakRound) {
            return res.status(400).json({ error: "No active tiebreak round found" });
        }

        validCandidates = currentTiebreakRound.candidates;
    } else {
        // For regular voting, get all candidates
        const registrations = await prisma.registration.findMany({
            where: {
                workshopId,
                candidate: true
            },
            select: {
                candidateName: true
            }
        });
        validCandidates = registrations.map(r => r.candidateName);
    }

    // Check if all selected options are valid candidates
    if (!selectedOptions.every(option => validCandidates.includes(option))) {
        return res.status(400).send({ error: "You can vote only for provided options." });
    }

    const voteData = {
        stakeAddress: expected_address,
        cardanoAddress: cardano_address,
        coseKeyHex: cose_key_hex,
        coseSignatureHex: cose_signature_hex,
        message: expected_message,
        selection1: selectedOptions[0],
        selection2: selectedOptions[1] ?? "",
        selection3: selectedOptions[2] ?? "",
        selection4: selectedOptions[3] ?? "",
        selection5: selectedOptions[4] ?? "",
        workshopId,
        userId: session.user.id
    }
    console.log({voteData})
    let savedVote;

    if (tiebreakVote) {
        if (!currentTiebreakRound) {
            return res.status(400).json({ error: "No active tiebreak round found" });
        }

        savedVote = await prisma.tiebreakVote.create({
            data: {
                ...voteData,
                tiebreakRoundId: currentTiebreakRound.id
            },
            include: {
                user: true,
               // TiebreakRound: true
            }
        });
    } else {
        savedVote = await prisma.vote.create({
            data: voteData,
            include: {
                user: true
            }
        });
    }

    res.status(200).json(savedVote);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
