import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import WorkshopState, { WorkshopStatus } from "@/lib/workshopState";
import { WorkshopWithCandidates } from "@/types/votings";
import { useQuery } from "@tanstack/react-query";
import TieBreakInfo from "./tie-break-info";
import { WorkshopDataRes } from "@/pages/api/workshop/data/[shortIdName]";

type Registration = {
    id: string;
    codeId: string;
    workshopId: string;
    userId: string;
    candidate: boolean;
    candidateName: string;
    registeredAt: string;
};

type WorkshopResult = {
    id: string;
    workshopId: string;
    registrationId: string;
    points: number;
    rank: number;
    createdAt: string;
    Registration: Registration;
    TiebreakRound?: {
        tbfplace: number;
        index: number;
    }
    tiebreakPoints?: number;
    voteCount?: number;
};

export interface TiebreakResult {
    TiebreakRound: {
        tbfplace: number;
        index: number;
    };
    points: number;
    voteCount: number;
}

interface MergedWorkshopResult extends WorkshopResult {
    tiebreakResults?: TiebreakResult[];
}

const { VoteEnded, TiebreakVoteNeeded, TiebreakVoteStarted, TiebreakVoteEnded, TiebreakVoteFinalized, VoteFinalized, VoteStarted } = WorkshopState

const fetchVoteResults = async (workshopId: string): Promise<WorkshopResult[]> => {
    const res = await fetch(`/api/votes/results/${workshopId}`)
    if (!res.ok) throw new Error('Failed to fetch vote results')
    return res.json()
}

const fetchVoteCount = async (workshopId: string): Promise<{ voteCount: number }> => {
    const res = await fetch(`/api/workshop/${workshopId}/voteCount`)
    if (!res.ok) throw new Error('Failed to fetch vote amount')
    return res.json()
}

const fetchTiebreakVoteResults = async (workshopId: string): Promise<WorkshopResult[]> => {
    const res = await fetch(`/api/tiebreakVotes/results/${workshopId}`)
    if (!res.ok) throw new Error('Failed to fetch tiebreak vote results')
    return res.json()
}

export default function VoteResults({ workshop }: { workshop: WorkshopDataRes }) {
    const showTiebreakResults = ([TiebreakVoteNeeded, TiebreakVoteStarted, TiebreakVoteEnded, TiebreakVoteFinalized] as WorkshopStatus[]).includes(workshop.status);

    const { data: voteCount, error: voteCountError, isLoading: voteCountLoading } = useQuery({
        queryKey: ['voteCount', workshop?.id, workshop.status, workshop.TiebreakRound.map(x => x.status).join(",")],
        queryFn: () => fetchVoteCount(workshop?.id as string),
        refetchOnWindowFocus: false,
        retryDelay: 5000,
        retry: 3,
        enabled: !!workshop && workshop.status >= VoteStarted,
    })

    const { data: voteResults, error: voteResultsError, isLoading: voteResultsLoading } = useQuery({
        queryKey: ['voteResults', workshop?.id, workshop.status, workshop.TiebreakRound.map(x => x.status).join(",")],
        queryFn: () => fetchVoteResults(workshop?.id as string),
        refetchOnWindowFocus: false,
        retryDelay: 5000,
        retry: 3,
        enabled: !!workshop && workshop.status >= VoteEnded,
    })

    const { data: tiebreakVoteResults, error: tiebreakVoteResultsError, isLoading: tiebreakVoteResultsLoading } = useQuery({
        queryKey: ['tiebreakVoteResults', workshop?.id, workshop.status, workshop.TiebreakRound.map(x => x.status).join(",")],
        queryFn: () => fetchTiebreakVoteResults(workshop?.id as string),
        refetchOnWindowFocus: false,
        retryDelay: 5000,
        retry: 3,
        enabled: !!workshop && showTiebreakResults,
    })

    const mergeResults = (voteResults: WorkshopResult[], tiebreakResults: WorkshopResult[]): MergedWorkshopResult[] => {
        const mergedResults: MergedWorkshopResult[] = voteResults.map(result => ({
            ...result,
            tiebreakResults: []
        }));

        tiebreakResults.forEach(tiebreakResult => {
            const index = mergedResults.findIndex(r => r.registrationId === tiebreakResult.registrationId);
            if (index !== -1) {
                mergedResults[index].tiebreakResults?.push({
                    TiebreakRound: tiebreakResult.TiebreakRound!,
                    points: tiebreakResult.points,
                    voteCount: tiebreakResult.voteCount || 0
                });
            }
        });

        // Sort tiebreak results for each registration
        mergedResults.forEach(result => {
            result.tiebreakResults?.sort((a, b) => {
                if (a.TiebreakRound.tbfplace !== b.TiebreakRound.tbfplace) {
                    return a.TiebreakRound.tbfplace - b.TiebreakRound.tbfplace;
                }
                return b.TiebreakRound.index - a.TiebreakRound.index;
            });
        });

        return mergedResults.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;

            // Compare tiebreak results
            const aLatestTiebreak = a.tiebreakResults![0];
            const bLatestTiebreak = b.tiebreakResults![0];

            if (aLatestTiebreak && bLatestTiebreak) {
                if (aLatestTiebreak.TiebreakRound.tbfplace !== bLatestTiebreak.TiebreakRound.tbfplace) {
                    return aLatestTiebreak.TiebreakRound.tbfplace - bLatestTiebreak.TiebreakRound.tbfplace;
                }
                if (aLatestTiebreak.TiebreakRound.index !== bLatestTiebreak.TiebreakRound.index) {
                    return bLatestTiebreak.TiebreakRound.index - aLatestTiebreak.TiebreakRound.index;
                }
                return bLatestTiebreak.points - aLatestTiebreak.points;
            }

            // If one has tiebreak results and the other doesn't, prioritize the one with tiebreak results
            if (aLatestTiebreak && !bLatestTiebreak) return -1;
            if (!aLatestTiebreak && bLatestTiebreak) return 1;

            return 0;
        });
    }

    const displayResults: MergedWorkshopResult[] = voteResults && tiebreakVoteResults
        ? mergeResults(voteResults, tiebreakVoteResults)
        : voteResults || [];

    const getPositionFromRank = (rank: number): string => {
        switch (rank) {
            case 1: return 'Chair';
            case 2: return 'Vice chair';
            case 3: return 'Backup';
            case 4: return 'Backup 2';
            case 5: return 'Backup 3';
            default: return ``;
        }
    }

    // console.log('displayResults', displayResults)

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Preliminary Vote Results
                </CardTitle>
            </CardHeader>
            <CardContent>
                {(voteResultsLoading || tiebreakVoteResultsLoading) && <div>Loading...</div>}
                {(voteResultsError || tiebreakVoteResultsError) && <div>Error: {(voteResultsError || tiebreakVoteResultsError)?.message}</div>}
                {!voteResultsLoading && !tiebreakVoteResultsLoading && (!displayResults || displayResults.length === 0) && <div>No results yet</div>}
                {!!voteCount && <p className="text-sm text-muted-foreground my-4">Total votes on first round: {voteCount.voteCount ?? 0}</p>}
                {displayResults && displayResults.length > 0 && (
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/6">Rank</TableHead>
                                    <TableHead className="w-1/3">Candidate</TableHead>
                                    <TableHead className="w-1/6">Points</TableHead>
                                    {showTiebreakResults && <TableHead className="w-1/3">Tiebreak</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {displayResults.filter(res => res.rank < 6).map((result) => (
                                    <TableRow key={result.id}>
                                        <TableCell className="font-medium">
                                            {result.rank}
                                            <div className="text-xs text-muted-foreground">
                                                {getPositionFromRank(result.rank)}
                                            </div>
                                        </TableCell>
                                        <TableCell>{result.Registration.candidateName}</TableCell>
                                        <TableCell>{result.points}</TableCell>
                                        {showTiebreakResults && (
                                            <TableCell>
                                                {result.tiebreakResults && result.tiebreakResults.length > 0
                                                    ? <div className="flex flex-col space-y-1" >
                                                        <p className="text-sm">{result.tiebreakResults?.sort((a, b) => a.TiebreakRound.index - b.TiebreakRound.index).map(t => t.points).join(' | ')} pts</p>
                                                        <TieBreakInfo
                                                            tiebreakResults={result.tiebreakResults}
                                                        />
                                                    </div>
                                                    : <div className="flex flex-col space-y-1" >
                                                        <p>{'-'}</p>
                                                        {workshop.status == WorkshopState.TiebreakVoteEnded && <TieBreakInfo
                                                            tiebreakResults={result.tiebreakResults || []}
                                                            wonWithoutAdditionalRound={true}
                                                        />}
                                                    </div>}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
