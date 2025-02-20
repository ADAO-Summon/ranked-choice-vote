import { Candidate } from "@/types/votings";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from "@/components/ui/button"
import { Trash, Trash2 } from "lucide-react";


const SelectedCandidatesList = (
    { selectedCandidates, onRemove }:
        {
            selectedCandidates: Candidate[];
            onRemove: (candidate: Candidate) => void;
        }
) => {
    return (
        <Droppable droppableId="candidates">
            {(provided) => (
                <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                >
                    {selectedCandidates.map((candidate, index) => (
                        <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                            {(provided) => (
                                <li
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="p-2 border-2 rounded-md flex items-center justify-between"
                                >
                                    <span>{index + 1}. {candidate.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemove(candidate)}
                                    >
                                        <Trash2 className="text-muted-foreground w-4 h-4" />
                                    </Button>
                                </li>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </ul>
            )}
        </Droppable>
    );
};

export default SelectedCandidatesList;