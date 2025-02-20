import { WorkshopStatus } from "@/lib/workshopState";

export type Candidate = {
    id: string;
    name: string;
    userId: string
};

export type Workshop = {
    id: string
    readableName: string
    isAdmin: boolean
    status: WorkshopStatus
    adminEmail: string
    secondaryAdminEmail?: string
    shortIdName: string
    scheduledFor?: string
}

export interface WorkshopWithCandidates extends Workshop {
    candidates: { userId: string, name: string }[]
}

export type UserWorkshop = {
    id: string
    readableName: string
    shortIdName: string
    status: WorkshopStatus
}
export type VoteData = {
    selection1: string
    selection2: string
    selection3: string
    selection4: string
    selection5: string
}
