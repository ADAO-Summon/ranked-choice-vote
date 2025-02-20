import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input"
import { Candidate } from '@/types/votings';
import { ScrollArea } from '@/components/ui/scroll-area';

const CandidateSearch = ({ candidates, selectedCandidates, onSelect }: {
    candidates: Candidate[];
    selectedCandidates: Candidate[];
    onSelect: (candidate: Candidate) => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCandidates = candidates.filter(candidate =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selectedCandidates.some(selected => selected.id === candidate.id)
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative mb-4" ref={dropdownRef}>
            <Input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && (
                <div className="absolute mb-10 z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {filteredCandidates.length > 0 ? (
                        <ScrollArea className="h-32" >
                            <div>
                                {filteredCandidates.map((candidate) => (
                                    <div
                                        key={candidate.id}
                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={() => {
                                            onSelect(candidate);
                                            setShowDropdown(false);
                                            setSearchTerm('');
                                        }}
                                    >
                                        {candidate.name}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="p-2">No candidates found</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CandidateSearch;