import { Workshop } from "@/types/votings";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import StatusProgressBar from "../vote-status-progress";
import { WorkshopDataRes } from "@/pages/api/workshop/data/[shortIdName]";

export default function WorkshopStatusCard({ workshop, participantAmount }: { workshop: WorkshopDataRes | undefined, participantAmount?: number }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Vote Status</CardTitle>
            </CardHeader>
            <CardContent>
                {workshop &&
                    <StatusProgressBar status={workshop.status} />}
                {!!participantAmount && <div className="text-left text-sm mt-4">Registered participants: {participantAmount}</div>}
            </CardContent>
        </Card>
    )
}