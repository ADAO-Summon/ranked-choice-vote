import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import ParticipantDialog from './participant-dialog';
import { AlertCircle, CheckCircle2, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkshopState, { getWorkshopStatusName } from '@/lib/workshopState';
import TiebreakRoundState, { getTiebreakRoundStatusName } from "@/lib/tiebreakRoundState" 
import RegistrationCodesDialog from '../registration-codes-dialog';
import ConfirmationDialog from './confirmation-dialog';
import { WorkshopDataRes } from '@/pages/api/workshop/data/[shortIdName]';

const AdminPanel = ({ workshop, handleAction, actionMutation }:
    { workshop: WorkshopDataRes, handleAction: any, actionMutation: any }
) => {
    const [activeTab, setActiveTab] = useState("registration");

    const ActionButton = ({ action, label, disabled, icon: Icon, className }:
        {
            className?: string;
            action: string;
            label: string;
            disabled: boolean;
            icon: any;
        }
    ) => (
        <Button
            variant="outline"
            onClick={() => handleAction(action)}
            disabled={disabled || actionMutation.isPending}
            className={className ? className : "w-full sm:w-auto flex items-center justify-center gap-2"}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
        </Button>
    );

    const currentTiebreakRound = workshop.TiebreakRound.find(round => round.status !== TiebreakRoundState.Finalized);
    const isTiebreakNeeded = workshop.status >= WorkshopState.TiebreakVoteNeeded && workshop.status < WorkshopState.TiebreakVoteFinalized;
    const isTiebreakFinalized = workshop.status === WorkshopState.TiebreakVoteFinalized;

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="text-yellow-500" />
                    Admin Controls
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto gap-2">
                        <TabsTrigger value="registration">Registration</TabsTrigger>
                        <TabsTrigger value="voting">Voting</TabsTrigger>
                        <TabsTrigger value="tiebreakVoting">Tie-Break Voting</TabsTrigger>
                    </TabsList>
                    <TabsContent value="registration" className="mt-4">
                        <div className="flex flex-wrap flex-col md:flex-row gap-4">
                            <ActionButton
                                action="startRegistration"
                                label="Start Registration"
                                disabled={workshop.status !== WorkshopState.Initial}
                                icon={CheckCircle2}
                            />
                            <ConfirmationDialog
                                title="Are you sure?"
                                description="Ending registration will prevent any new participants from registering. This action is not reversible."
                                onConfirm={() => handleAction("endRegistration")}
                                confirmationButton={
                                    <Button
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 text-primary-foreground border-primary"
                                    >Confirm</Button>
                                }
                                trigger={
                                    <Button
                                        disabled={workshop.status !== WorkshopState.RegistrationStarted}
                                        variant="outline"
                                        className="w-full sm:w-auto flex items-center justify-center gap-2"
                                    >
                                        <Flag className="w-4 h-4" />
                                        End Registration
                                    </Button>
                                }
                            />
                            <RegistrationCodesDialog workshopId={workshop.id} handleRequestCodes={(count = 0) => handleAction('requestRegistrationCodes', count)} />
                            <ParticipantDialog workshopId={workshop.id} viewOnly={workshop.status > 2} />
                        </div>
                    </TabsContent>
                    <TabsContent value="voting" className="mt-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <ActionButton
                                action="startVoting"
                                label="Start Voting"
                                disabled={workshop.status !== WorkshopState.RegistrationEnded}
                                icon={CheckCircle2}
                            />
                            <ActionButton
                                action="endVoting"
                                label="End Voting"
                                disabled={workshop.status !== WorkshopState.VoteStarted}
                                icon={Flag}
                            />
                            <ConfirmationDialog
                                title="Are you sure?"
                                description="This action is not reversible."
                                onConfirm={() => handleAction("finalizeVoting")}
                                confirmationButton={
                                    <Button
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 text-primary text-primary-foreground border-primary"
                                    >Confirm</Button>
                                }
                                trigger={
                                    <Button
                                        disabled={workshop.status !== WorkshopState.VoteEnded}
                                        variant="outline"
                                        className="w-full sm:w-auto flex items-center justify-center gap-2"
                                    >
                                        <Flag className="w-4 h-4" />
                                        Finalize Voting
                                    </Button>
                                }
                            />
                            <ActionButton
                                action="resetVoting"
                                label="Reset Voting"
                                icon={AlertCircle}
                                disabled={workshop.status !== WorkshopState.VoteEnded}
                            />
                        </div>
                    </TabsContent>
                    <TabsContent value="tiebreakVoting" className="mt-4">
                        <div className="mb-4">
                            {/* <h3 className="text-lg font-semibold mb-2">Current Workshop Status: {getWorkshopStatusName(workshop.status)}</h3> */}
                            {currentTiebreakRound && (
                                <div>
                                    <p>Current Tiebreak Round: {currentTiebreakRound.tbfplace}</p>
                                    <p>Status: {getTiebreakRoundStatusName(currentTiebreakRound.status)}</p>
                                    <p>Candidates: {currentTiebreakRound.candidates.join(', ')}</p>
                                </div>
                            )}
                            {!currentTiebreakRound && isTiebreakNeeded && (
                                <p>No active tiebreak round. Ready to start a new round.</p>
                            )}
                            {isTiebreakFinalized && (
                                <p>All tiebreak rounds have been finalized.</p>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4">
                            <ActionButton
                                action="startTiebreakVoting"
                                label="Start Tie-Break Voting"
                                disabled={!isTiebreakNeeded || ((currentTiebreakRound || false) && currentTiebreakRound.status !== TiebreakRoundState.Initial) || isTiebreakFinalized}
                                icon={CheckCircle2}
                            />
                            <ActionButton
                                action="endTiebreakVoting"
                                label="End Tie-Break Voting"
                                disabled={!currentTiebreakRound || currentTiebreakRound.status !== TiebreakRoundState.Started || isTiebreakFinalized}
                                icon={Flag}
                            />
                            <ActionButton
                                action="finalizeTiebreakVoting"
                                label="Finalize Tie-Break Voting"
                                disabled={!currentTiebreakRound || currentTiebreakRound.status !== TiebreakRoundState.Ended || isTiebreakFinalized}
                                icon={CheckCircle2}
                            />
                            <ActionButton
                                action="resetTiebreakVoting"
                                label="Reset Tie-Break Voting"
                                disabled={!currentTiebreakRound || currentTiebreakRound.status !== TiebreakRoundState.Ended || isTiebreakFinalized}
                                icon={AlertCircle}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default AdminPanel;