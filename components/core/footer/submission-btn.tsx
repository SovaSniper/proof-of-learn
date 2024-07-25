"use client"

import React, { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useQuest } from "@/components/providers/quest-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { fetchSubmission, fetchUserSubmission, SubmissionResponse, UserSubmissionResponse } from "@/lib/db/mongo-service";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import toast from 'react-hot-toast';
import { Pickaxe } from "lucide-react";
import confetti from "canvas-confetti";

interface SubmissionButtonProps extends React.HTMLAttributes<HTMLDivElement> {
}

export function SubmissionButton({ className }: SubmissionButtonProps) {
    const { selectedQuest } = useQuest()
    const { address } = useAccount()

    const [submissionResponse, setSubmissionResponse] = useState<SubmissionResponse>({} as SubmissionResponse)
    const [userSubmissionResponse, setUserSubmissionResponse] = useState<UserSubmissionResponse>({} as UserSubmissionResponse)
    const [open, setOpen] = useState(false);

    // Sample: 0x2776655a8d810840286d75abfae2c083107bdc1978712ec0c8cb4aadcbc6968c
    const [data, setData] = useState<string>("")

    useEffect(() => {
        (async () => {
            // Only fetch if connected wallet and selected quest
            if (!address) return
            if (selectedQuest?.name.id === undefined) return
            try {
                setSubmissionResponse({} as SubmissionResponse)
                const submission = await fetchSubmission(selectedQuest?.name.id)
                setSubmissionResponse(submission)

                const userSubmission = await fetchUserSubmission(selectedQuest?.name.id, address)
                setUserSubmissionResponse(userSubmission)
                console.log(userSubmission)
            } catch (error: any) {
                console.error(error)
            }
        })()
    }, [selectedQuest, address])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmission = async () => {
        if (selectedQuest?.name.id === undefined) {
            toast.error("Couldn't find the quest. How did you get here?")
            return
        }

        if (!data) {
            toast.error("Please enter a transaction hash")
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch("/api/db/submission/submit", {
                method: "POST",
                body: JSON.stringify({ id: selectedQuest?.name.id, payload: data, address }),
            })

            if (!response.ok) {
                const { message } = await response.json()
                toast.error(message)
                return
            }

            const result = await response.json()
            console.log(result)

            triggerConfetti()
            triggerConfetti()
            triggerConfetti()
            setOpen(false)
            toast.success("Completed")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const triggerConfetti = () => {
        const defaults = {
            spread: 360,
            ticks: 50,
            gravity: 0,
            decay: 0.94,
            startVelocity: 30,
            colors: ["#FFE400", "#FFBD00", "#E89400", "#FFCA6C", "#FDFFB8"],
        };

        const shoot = () => {
            confetti({
                ...defaults,
                particleCount: 40,
                scalar: 1.2,
                shapes: ["star"],
            });

            confetti({
                ...defaults,
                particleCount: 10,
                scalar: 0.75,
                shapes: ["circle"],
            });
        };

        setTimeout(shoot, 0);
        setTimeout(shoot, 100);
        setTimeout(shoot, 200);
    };

    if (!address) return <Button disabled={true} size="sm" variant="ghost">Connect Wallet to Submit Quest</Button>
    if (!submissionResponse.result) return <></>

    if (userSubmissionResponse.result?.completed) return <Button disabled={true} size="sm" variant="ghost">Quest Completed 🎉</Button>
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className={buttonVariants({ variant: "default" })}>
            <div className="hidden md:block">Submit Quest</div>
            <Pickaxe />
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Enter the transaction hash for validate the deployment and contract execution</DialogTitle>
                <DialogDescription>
                    <Input placeholder={submissionResponse?.result.type}
                        onChange={(e) => setData(e.target.value)} value={data} />
                </DialogDescription>
            </DialogHeader>

            <Button onClick={handleSubmission} disabled={isSubmitting}>
                {!isSubmitting
                    ? <>
                        <div className="hidden md:block">Submit Quest</div>
                        <Pickaxe />
                    </>
                    : <div>Validating...</div>}
            </Button>
        </DialogContent>
    </Dialog >
}