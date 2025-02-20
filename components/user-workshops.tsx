// components/UserWorkshops.tsx

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { UserWorkshop } from '@/types/votings'
import WorkshopList from './workshop/workshop-list'
import Link from 'next/link'
import { useDebounce } from 'use-debounce';

const fetchUserWorkshops = async (): Promise<UserWorkshop[]> => {
    const res = await fetch('/api/user/workshops')
    if (!res.ok) throw new Error('Failed to fetch user workshops')
    return res.json()
}

const checkIfManager = async (): Promise<boolean> => {
    const res = await fetch('/api/user/isManager')
    if (!res.ok) throw new Error('Failed to check manager status')
    const data = await res.json()
    return data.isManager
}

const registerForWorkshop = async (data: RegistrationData) => {
    const res = await fetch('/api/workshop/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.message ? json.message : 'Failed to register for workshop')
    return json
}

type RegistrationData = {
    registrationCode: string;
    candidateName: string;
    candidate: boolean;
};

const checkCandidateName = async (registrationCode: string, candidateName: string): Promise<boolean> => {
    if (!registrationCode || registrationCode == "") throw new Error('A valid registration code is required')
    const res = await fetch(`/api/workshop/check-candidate-name?registrationCode=${registrationCode.trim().toLowerCase()}&candidateName=${candidateName}`)
    if (!res.ok) throw new Error('Failed to check candidate name')
    return res.json()
}

// const fetchDemoRegistrationCode = async (): Promise<string> => {
//     const res = await fetch('/api/workshop/getRandomDemoCode')
//     if (!res.ok) throw new Error('Failed to fetch demo registration code')
//     const data = await res.json()
//     return data.code
// }

export function UserWorkshops() {
    const [isOpen, setIsOpen] = useState(false)
    const [registrationCode, setRegistrationCode] = useState('')
    const [candidateName, setCandidateName] = useState('')
    const [isCandidate, setIsCandidate] = useState(false)
    const [nameError, setNameError] = useState('')
    const [isCheckingName, setIsCheckingName] = useState(false)
    const latestCheck = useRef('');

    const [hasAgreed, setHasAgreed] = useState(true)

    const queryClient = useQueryClient()

    const { data: workshops, error, isLoading } = useQuery<UserWorkshop[], Error>({
        queryKey: ['userWorkshops'],
        queryFn: fetchUserWorkshops,
        refetchInterval: 60000,
    })

    const { data: isManager, isLoading: isManagerLoading } = useQuery<boolean, Error>({
        queryKey: ['isManager'],
        queryFn: checkIfManager,
    })



    const registerMutation = useMutation<any, Error, RegistrationData>({
        mutationFn: registerForWorkshop,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userWorkshops'] })
            setIsOpen(false)
            setRegistrationCode('')
            setCandidateName('')
            setIsCandidate(false)
        },
    })

    // const demoCodeMutation = useMutation({
    //     mutationFn: fetchDemoRegistrationCode,
    //     onSuccess: (code) => {
    //         setRegistrationCode(code)
    //     },
    // })

    const isFormValid = () => {
        if (!registrationCode) return false;
        if (isCandidate && !candidateName) return false;
        if (nameError || isCheckingName) return false;
        if (isCandidate && !hasAgreed) return false;
        return true;
    };

    const handleRegister = () => {
        if (!isFormValid()) return;

        registerMutation.mutate({
            registrationCode: registrationCode.trim().toLowerCase(),
            candidateName,
            candidate: isCandidate
        });
    };

    const checkName = useCallback(async (name: string) => {
        if ( name && !nameError) {
            setIsCheckingName(true);
            latestCheck.current = name;
            console.log("checking name")
            try {
                const isAvailable = await checkCandidateName(registrationCode, name);
                console.log({ isAvailable });
                if (name === latestCheck.current) {  // Ensure we're still checking the latest input
                    if (!isAvailable) {
                        setNameError('This name is already in use');
                    } else {
                        setNameError('');  // Clear error if name is available
                    }
                }
            } catch (error: any) {
                console.error('Failed to check candidate name:', error);
                if (name === latestCheck.current) {
                    setNameError(`${error.message ? error.message : ""}`);
                }
            } finally {
                if (name === latestCheck.current) {
                    setIsCheckingName(false);
                }
            }
        }
    }, [isCandidate, registrationCode, checkCandidateName]);

    const [debouncedCheckName] = useDebounce(checkName, 500);

    const handleCandidateNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setCandidateName(name);

        // Basic validation
        if (name === '') {
            setNameError('');  // Clear error for empty input
        } else {
            console.log("debouncing")
            setNameError('');  // Clear error if basic validation passes
            debouncedCheckName(name);
        }
    };

    useEffect(() => {
        if (!isCandidate) {
            setCandidateName('')
            setNameError('')
        }
    }, [isCandidate])

    if (isLoading || isManagerLoading) return <Skeleton className="w-full h-96" />

    if (error) return <div>Error: {error.message}</div>

    return (
        <>
            <div className="flex flex-col items-start space-y-2 mt-4 mb-6">
                <h2 className="text-xl font-bold">My Workshops</h2>
                {isManager && (
                    <Link href="/manage/workshops" passHref>
                        <Button>Manage All Workshops</Button>
                    </Link>
                )}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button variant={isManager ? 'ghost' : 'default'}>Register for Workshop</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white" >
                        <DialogHeader className="text-secondary-foreground" >
                            <DialogTitle>Register for a New Workshop</DialogTitle>
                            <DialogDescription>
                                Enter the registration code provided by the workshop administrator.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="registration-code" className="text-left text-card-foreground">
                                    Registration Code
                                </Label>
                                <div className="col-span-3 flex items-center space-x-2">
                                    <Input
                                        id="registration-code"
                                        value={registrationCode}
                                        onChange={(e) => setRegistrationCode(e.target.value.toLowerCase())}
                                        className="flex-grow"
                                    />
                                    {/* <Button
                                        onClick={() => demoCodeMutation.mutate()}
                                        disabled={demoCodeMutation.isPending}
                                        size="sm"
                                    >
                                        {demoCodeMutation.isPending ? 'Getting...' : 'Get Demo Code'}
                                    </Button> */}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="candidate-name" className="text-left text-card-foreground">
                                    Your name
                                </Label>
                                <div className="col-span-3 flex flex-col items-center space-y-2">
                                    <Input
                                        id="candidate-name"
                                        value={candidateName}
                                        onChange={handleCandidateNameChange}
                                        //onBlur={handleCandidateNameBlur}
                                        className={nameError ? "border-red-500" : ""}
                                    />
                                    <p className={`text-sm text-gray-500 ${isCheckingName ?'visible' : 'invisible'}`}>Checking name availability...</p>
                                    <p className={`text-sm text-red-500 ${nameError ? 'visible' : 'invisible'}`}>{nameError}</p>
                                </div>
                            </div>
                            <div className="flex flex-row items-center space-x-2">
                                <div className="flex">
                                    <Checkbox
                                        id="is-candidate"
                                        checked={isCandidate}
                                        onCheckedChange={(checked: boolean) => setIsCandidate(checked as boolean)}
                                    />
                                </div>
                                <Label htmlFor="is-candidate" className="text-left text-sm font-normal text-card-foreground">
                                    Run as candidate
                                </Label>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleRegister}
                                disabled={registerMutation.isPending || !isFormValid() || !candidateName}
                            >
                                {registerMutation.isPending ? 'Registering...' : 'Register'}
                            </Button>
                        </div>
                        {registerMutation.isError && (
                            <p className="text-red-500 mt-2">Error: {registerMutation.error.message}</p>
                        )}
                    </DialogContent>
                </Dialog>

            </div>
            {(!workshops || workshops.length === 0) ? (
                <div>No workshops found.</div>
            ) : (
                <WorkshopList workshops={workshops} />
            )}
        </>
    )
}