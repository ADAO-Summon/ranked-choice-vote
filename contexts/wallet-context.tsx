import { Blockfrost, Lucid, Network, WalletApi } from "lucid-cardano";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useWeb3Auth } from "./web3auth-context";
import { AccountAddresses, AccountBalances } from "@/types/web3auth";
import { getCardanoAssetsByAddress } from "../utils/web3auth/cardano";
import { newEmptyAddresses, newEmptyBalance } from "../utils/web3auth/multichain";
import { Blockchain } from "@/types/multichain";
import { toast } from "sonner";
import { updateWeb3AuthAddress } from "@/utils/web3auth";

export const WalletContext = createContext<{
    walletName: string,
    walletApi: WalletApi | null,
    blockchain: Blockchain | null,
    lucid: Lucid | null,
    connected: boolean,
    connectWallet: (walletName: string, blockchain: string) => void,
    addresses: Record<Blockchain, string | null>,
    disconnectWallet: () => void,
    setBlockchain: (blockchain: Blockchain | null) => void,
    balance: AccountBalances | null,
}>({
    walletName: "",
    walletApi: null,
    blockchain: null,
    connected: false,
    lucid: null,
    connectWallet: (walletName: string, blockchain: string) => { },
    addresses: newEmptyAddresses(),
    disconnectWallet: () => { },
    setBlockchain: (blockchain: Blockchain | null) => { },
    balance: newEmptyBalance(),
});

export const useWalletContext = () => {
    return useContext(WalletContext);
}


export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [walletName, setWalletName] = useState<string>("");
    const [walletApi, setWalletApi] = useState<WalletApi | null>(null);
    const [blockchain, setBlockchain] = useState<Blockchain | null>(null);
    const [lucid, setLucid] = useState<Lucid | null>(null);
    const [connected, setConnected] = useState<boolean>(false);
    const [balance, setBalance] = useState<AccountBalances | null>(newEmptyBalance());
    const [addresses, setAddresses] = useState<AccountAddresses>(newEmptyAddresses());
    const [referralCode, setReferralCode] = useState<string>("");
    //const { logout: web3authLogout, web3AuthAPI, walletAddress, login: web3auth!.fullLogin, loggedIn, getAccounts, getBalance, isLoading } = useWeb3Auth();
    const { web3Auth: web3auth, isLoading: isWeb3AuthNotInstantiated } = useWeb3Auth();
    useEffect(() => {
        if (referralCode && referralCode !== "") {
            localStorage.setItem("referralCode", referralCode);
        }
    }, [referralCode])

    const connectWallet = async (walletName: string, blockchain: string) => {
        console.log("connecting wallet")
        setWalletName(walletName);
        setBlockchain(blockchain as Blockchain);
        if (walletName === "web3auth" && web3auth?.cardanoWalletAPI) {
            const walletApi = web3auth?.cardanoWalletAPI;
            setWalletApi(walletApi);
            web3auth!.getBlockchainAccounts().then(async (accounts) => {
                console.log({ accounts })
                if (accounts) {
                    setAddresses(accounts)
                    const cardanoAddress = accounts.cardano;
                    if(cardanoAddress){
                        await updateWeb3AuthAddress(cardanoAddress);
                    }
                };
            });
            web3auth!.getBlockchainBalances().then((balances) => {
                if (balances) setBalance({ ...balances, isLoading: false });
            });
            Lucid.new(new Blockfrost(process.env.NEXT_PUBLIC_BLOCKFROST_URL as string, process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string), process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK as Network).then(async (lucid) => {
                lucid.selectWallet(walletApi!);
                setLucid(lucid);
            });
        } else if (blockchain === "cardano") {
            const walletApi = await window.cardano[walletName].enable();
            setWalletApi(walletApi);
            Lucid.new(new Blockfrost(process.env.NEXT_PUBLIC_BLOCKFROST_URL as string, process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string), process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK as Network).then(async (lucid) => {
                lucid.selectWallet(walletApi);
                const address = await lucid.wallet.address();
                setAddresses({ ...addresses, cardano: address });
                setLucid(lucid);
                try {
                    const cardanoBalance = await getCardanoAssetsByAddress(address);
                    setBalance({ isLoading: false, assets: { ...balance!.assets, cardano: cardanoBalance } });
                } catch (e) {
                    toast.error("Error fetching balance")
                }
            });
        }
        setConnected(true);
        localStorage.setItem("walletName", walletName);
        localStorage.setItem("blockchain", blockchain);
        localStorage.setItem("connected", "true");
        localStorage.removeItem("referralCode")
    }

    useEffect(() => {
        const localStorageBlockchain = localStorage.getItem("blockchain");
        if (blockchain && (!localStorageBlockchain || blockchain !== localStorageBlockchain)) {
            localStorage.setItem("blockchain", blockchain);
        }
    }, [blockchain])

    const disconnectWallet = () => {
        console.log("disconnecting wallet")
        setConnected(false);
        setWalletName("");
        setBlockchain(null);
        setWalletApi(null);
        setAddresses(newEmptyAddresses());
        setBalance(newEmptyBalance())
        localStorage.removeItem("walletName");
        localStorage.removeItem("blockchain");
        localStorage.removeItem("connected");
        localStorage.removeItem("referralCode");
        localStorage.removeItem("loginMethod");
        if (walletName === "web3auth") {
            web3auth?.logout();
        }
    }
    const web3authLogout = web3auth?.logout ? web3auth.logout : () => { };
    //const isLoading = web3auth?.isLoading// === "loading";
    

    useEffect(() => {
        const walletName = localStorage.getItem("walletName");
        const blockchain = localStorage.getItem("blockchain");
        console.log({walletName, blockchain})
        if (walletName && blockchain) {
            setWalletName(walletName);
            setBlockchain(blockchain as Blockchain);
            if (walletName !== "web3auth") {
                connectWallet(walletName, blockchain);
            }
        }
    }, [])

    useEffect(() => {
        function getWalletName() {
            console.log("getting wallet name")
            const item = localStorage.getItem('walletName')
            console.log({item})
            if (item) {
                setWalletName(item)
            }
        }
        console.log("adding event listener for localstorage")

        window.addEventListener('walletName', getWalletName)

        return () => {
            window.removeEventListener('walletName', getWalletName)
        }
    }, [])

    useEffect(() => {
        console.log("before connecting wallet", { walletName, web3auth })
        if (walletName === "web3auth" && web3auth?.status === "full_login" && web3auth?.cardanoWalletAPI) {
            const localStorageBlockchain = localStorage.getItem("blockchain");
            console.log({ walletName }, "connecting wallet")
            connectWallet("web3auth", localStorageBlockchain || "cardano");
        } else if (walletName === "web3auth" && web3auth?.status === "initialized") {
            disconnectWallet();
        }
    }, [walletName, web3auth?.coreKitInstance?.status, web3auth?.status, web3auth?.cardanoWalletAPI]);
    /* useEffect(() => {
        if (walletName != "web3auth") {
            Lucid.new(new Blockfrost(process.env.NEXT_PUBLIC_BLOCKFROST_URL as string, process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string)).then((lucid) => {
                setLucid(lucid);
            });
        }
    }, [walletName]); */

    return (
        <WalletContext.Provider value={{ walletName, walletApi, blockchain, lucid, connectWallet, connected, addresses, disconnectWallet, setBlockchain, balance }}>
            {children}
        </WalletContext.Provider>
    )
}