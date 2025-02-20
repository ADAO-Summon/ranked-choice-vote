import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { TiebreakResult } from './results';

const TieBreakInfo = ({ tiebreakResults, wonWithoutAdditionalRound }:{tiebreakResults: TiebreakResult[], wonWithoutAdditionalRound?:boolean}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="p-0 h-auto">
          <Info className="h-4 w-4 text-secondary-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {wonWithoutAdditionalRound ?
        <p>
          This candidate won this rank without the need for an additional round of voting. In case of ties, decimal points were awarded to break the tie to the candidate with most 5 point votes, followed by 4 point votes (if still tied), and so on.
        </p>
        :
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Tie Break Information</h4>
            <p className="text-sm text-muted-foreground">
              These are the points that were awarded in the tiebreak rounds for this rank.
            </p>
          </div>
          {tiebreakResults?.map((result, index) => (
            <div key={index} className="grid gap-2">
              <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-sm col-span-2">Round {result.TiebreakRound.index+1}: </span>
                <span className="col-span-2 text-sm font-medium">{result.points} pts</span>
              </div>
            </div>
          ))}
        </div>}
      </PopoverContent>
    </Popover>
  );
};

export default TieBreakInfo;