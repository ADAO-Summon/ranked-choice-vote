import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useWalletContext } from "@/contexts/wallet-context"
import { useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useWeb3Auth } from "@/contexts/web3auth-context"
import { useRouter } from "next/router"

export function ConnectDialog({ text }: { text: string | React.ReactNode }) {
    const { connectWallet, walletName } = useWalletContext();
    const [showCardanoWallets, setShowCardanoWallets] = useState(false);
    const { web3Auth: web3auth, isLoading: isWeb3AuthNotInstantiated } = useWeb3Auth();
    const router = useRouter();

    //get router params
    const { query } = router;

    return (
        <Dialog onOpenChange={(open) => setShowCardanoWallets(false)} >
            <DialogTrigger asChild>
                <Button disabled={web3auth?.status != "full_login" && walletName === "web3auth"} >
                    {
                        (web3auth?.status != "full_login" && walletName === "web3auth") ?
                            <Loader2 className="animate-spin" />
                            : text
                    }
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] justify-center text-center content-center bg-white">
                <DialogHeader className="text-center justify-center content-center" >
                    {showCardanoWallets && <Button variant="ghost" onClick={() => setShowCardanoWallets(false)} className="absolute top-2 left-2">
                        <ArrowLeft />
                    </Button>}
                    <DialogTitle className="text-center" >Connect</DialogTitle>
                    <DialogDescription className="text-center" >
                       Connect your wallet to access all features
                    </DialogDescription>
                </DialogHeader>
                
                    <div className="grid grid-cols-2 gap-4 items-center content-center justify-center">
                        <Button className="col-span-2" variant="outline" onClick={() => { web3auth!.login('google'); localStorage.setItem('loginMethod', 'google') }} >
                            <div className="flex flex-row gap-2">
                                <p>Connect with Google</p>
                            </div>
                        </Button>
                    </div>
                {/* <DialogFooter className="flex justify-center text-center">
                    <Button type="submit">Save changes</Button>
                </DialogFooter> */}
            </DialogContent>
        </Dialog>
    )
}
