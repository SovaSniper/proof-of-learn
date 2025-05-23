"use client";

import React, { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useQuest } from "@/components/providers/quest-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Award } from "lucide-react";
import { PoapMetadata, POLPoapContract, selectedNetwork } from "@/lib/poap";
import toast from "react-hot-toast";
import { createWalletClient, custom } from "viem";
import confetti from "canvas-confetti";
import { retrieve } from "@/lib/util/ipfs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useWallet } from "@/components/core/wallet/wallet-provider";
import { CoursePage } from "../home/poap/course-page";

interface MintingQuestProps extends React.HTMLAttributes<HTMLDivElement> { }

export function MintingQuest({ className }: MintingQuestProps) {
    const { questPoap } = useQuest();
    const wallet = useWallet();

    const [metadata, setMetadata] = useState("");
    const [poapMetadata, setPoapMetadata] = useState<
        PoapMetadata | undefined
    >();

    const [open, setOpen] = useState(false);

    useEffect(() => {
        (async () => {
            if (questPoap) {
                const contract = new POLPoapContract({});
                const metadata = await contract.uri(
                    questPoap.tokenId.toString(),
                );
                setHasMinted(0);

                if (!metadata) {
                    toast.error("Error getting metadata for POAP");
                    return;
                }

                const data: PoapMetadata = await retrieve(metadata);
                setPoapMetadata(data);
                setMetadata(metadata);

                if (!(await wallet.isConnected())) {
                    const address = await wallet.getAccount();
                    if (address) {
                        const timeStamp = await contract.mintTracker(
                            questPoap.tokenId.toString(),
                            address,
                        );
                        if (timeStamp !== BigInt(0)) {
                            setHasMinted(Number(timeStamp) * 1000);
                        }
                    }
                }
            }
        })();
    }, [questPoap]);

    const [isMinting, setIsMinting] = useState("");
    const [hasMinted, setHasMinted] = useState(0);
    const handleMinting = async () => {
        console.log("Minting");
        setIsMinting("Validating ...");

        try {
            if (!questPoap) {
                return;
            }

            if (!(await wallet.isConnected())) {
                toast.error("Please connect to a wallet");
                return;
            }

            const address = await wallet.getAccount();
            if (!address) {
                toast.error("Couldn't found an account");
                return;
            }

            const requestBody = {
                owner: questPoap.owner,
                name: questPoap.name,
                address,
            };

            const response = await fetch("/api/mint-v2", {
                method: "POST",
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();
            if (!response.ok) {
                toast.error(result.message);

                if (result.message.contains("POAP already minted")) {
                    setHasMinted(0);
                }
                return;
            }

            console.log(result);
            if (!result.signature) {
                toast.error("API Error, please contact the PoL team");
                return;
            }

            if (!result.verificationHash) {
                toast.error("Verification, please contact the PoL team");
                return;
            }

            const walletClient = createWalletClient({
                account: address as `0x${string}`,
                chain: selectedNetwork,
                transport: custom(window.ethereum!),
            });

            await walletClient.switchChain({ id: selectedNetwork.id });

            setIsMinting("Minting ...");

            const poapContract = new POLPoapContract({ wallet: walletClient });
            const hash = await poapContract.mint(
                address as `0x${string}`,
                result.tokenId,
                "0x",
                result.verificationHash,
                result.signature,
            );

            triggerConfetti();
            triggerConfetti();
            triggerConfetti();

            // setOpen(false)
            console.log("transactionHash", hash);
            toast.success(`Poap minted successfully. Hash ${hash}`);

            setHasMinted(Date.now());

            fetch("/api/mint-v2/analytics", {
                method: "POST",
                body: JSON.stringify(requestBody),
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsMinting("");
        }
    };

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

    return (
        <>
            {questPoap !== undefined && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger
                        className={buttonVariants({ variant: "default" })}
                    >
                        <div className="hidden md:block">Poap</div>
                        <Award />
                    </DialogTrigger>
                    <DialogContent className="max-h-[90%] overflow-auto">
                        <VisuallyHidden>
                            <DialogTitle></DialogTitle>
                            <DialogDescription></DialogDescription>
                        </VisuallyHidden>
                        <div>
                            {poapMetadata && (
                                <CoursePage
                                    tokenId={questPoap.tokenId}
                                    poap={poapMetadata}
                                    uri={metadata}
                                    displayStartLearning={false}
                                />
                            )}
                        </div>
                        {hasMinted ? (
                            <Button disabled={true}>
                                Congratz! You completed this course{" "}
                                {new Date(hasMinted).toLocaleDateString(
                                    "en-US",
                                    {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    },
                                )}{" "}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleMinting}
                                disabled={!!isMinting}
                                className="my-2"
                            >
                                {!isMinting ? (
                                    <>
                                        <div className="hidden md:block">
                                            Mint POL Poap
                                        </div>
                                        <Award />
                                    </>
                                ) : (
                                    <div>{isMinting ? isMinting : ""}</div>
                                )}
                            </Button>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
