import React from 'react';
import WorkshopState, { getWorkshopStatusName, WorkshopStatus } from '@/lib/workshopState';

interface ProgressBarProps {
  status: WorkshopStatus;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
  const totalSteps = 9; // 0 to 8
  const currentStep = status + 1; // +1 because we want to show progress for the current step

  const isTiebreakVote = status >= WorkshopState.TiebreakVoteNeeded && status <= WorkshopState.TiebreakVoteFinalized

  const getStepClass = (step: number) => {
    if (step < currentStep) return 'bg-blue-500';
    if (step === currentStep) return 'bg-primary';
    return 'bg-gray-200';
  };

  const getVisibleSteps = () => {
    if (!isTiebreakVote) {
      return [0, 1, 2, 3, 4, 5];
    } else {
      return [0, 1, 2, 6, 7, 8, 9];
    }
  };

  const visibleSteps = getVisibleSteps();

  const getStatusName = (step: number): string => {
    return getWorkshopStatusName(step as WorkshopStatus);
  };

  return (
    <div className="w-full mt-4">
      <div className="flex mb-2 invisible md:visible">
        {visibleSteps.map((step, index) => (
          <div key={index} className="flex-1">
            <div className={`h-2 rounded ${getStepClass(step + 1)}`}>
              <div className="h-2 w-2 bg-white rounded-full" />
              <div className="text-xs w-full mt-2 text-center">{getStatusName(step)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="visible md:invisible">
        {getStatusName(status)}
      </div>
    </div>
  );
};

export default ProgressBar;