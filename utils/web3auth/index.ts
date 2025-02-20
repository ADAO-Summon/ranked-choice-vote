import { newEmptyAddresses, newEmptyBalance } from "./multichain";
import { AccountAddresses, AccountBalances, OAuthClients } from "@/types/web3auth";
import { getCardanoAddressInfo, getCardanoAssetsByAddress } from "./cardano";

import { COREKIT_STATUS, SubVerifierDetailsParams, TssShareType, UserInfo, Web3AuthMPCCoreKit, generateFactorKey, getWebBrowserFactor, keyToMnemonic } from "@web3auth/mpc-core-kit";
import { TORUS_SAPPHIRE_NETWORK } from "@toruslabs/constants";
import { Web3AuthWalletAPI, createWalletFromMnemonic, getAddressesFromKeys } from "./walletAPI";
import { C, Emulator, Network, WalletApi } from "lucid-cardano";
import BN from "bn.js";
import jwt from 'jsonwebtoken';
import { logError } from "../error-logs";

const web3AuthNetwork = TORUS_SAPPHIRE_NETWORK.SAPPHIRE_DEVNET

let instance: Web3Auth | null = null;

function ensure64DigitPrivateKey(privateKey: string): string {
    if (privateKey.length < 64) {
        return privateKey.padStart(64, "0");
    }
    return privateKey;
}

export const getChainConfig = (network: "Mainnet" | "Preprod") => {
    return network === "Mainnet" ?
        {
            chainNamespace: "eip155" as any,
            chainId: "0x89", // hex of 137, polygon mainnet
            rpcTarget: "https://rpc.ankr.com/polygon",
            // Avoid using public rpcTarget in production.
            // Use services like Infura, Quicknode etc
            displayName: "Polygon Mainnet",
            blockExplorer: "https://polygonscan.com",
            ticker: "MATIC",
            tickerName: "Matic",
        }
        :
        {
            chainNamespace: "eip155" as any,
            chainId: "0x13882", // hex of 80001, polygon testnet
            rpcTarget: "https://polygon-amoy-bor-rpc.publicnode.com",//"https://polygon-testnet.public.blastapi.io",// "https://rpc.ankr.com/polygon_mumbai", //"https://polygon-mumbai-pokt.nodies.app", //,
            // Avoid using public rpcTarget in production.
            // Use services like Infura, Quicknode etc
            displayName: "Polygon MATIC Testnet",
            blockExplorer: "https://amoy.polygonscan.com/",// "https://mumbai.polygonscan.com/",
            ticker: "MATIC",
            tickerName: "MATIC",
            logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
        };
}

type Status = 'not_initialized' | 'initializing' | 'initialized' | 'logged_in' | 'accounts_created' | 'api_created' | 'full_login'
type PrivateData = {
    seedPhrase: string | null,
    cardanoPaymentKey: C.PrivateKey | null,
    cardanoStakeKey: C.PrivateKey | null,
    web3AuthClientId: string,
}
export class Web3Auth {
    oAuthClients: OAuthClients;
    network: "Mainnet" | "Preprod";
    blockfrostKey: string;
    blockfrostUrl: string;
    redirectPathName: string;
    redirectUri: string;
    //web3AuthClientId: string;
    chainConfig: any;
    coreKitInstance: Web3AuthMPCCoreKit;
    cardanoAddress: string;
    cardanoWalletAPI: WalletApi | null;
    backupFactorKey: string | null;
    isAccountsCreated: boolean;
    status: Status
    onStatusChange?: (status: Status) => void
    // private seedPhrase: string | null;
    private static instance: Web3Auth | null = null;
    // Declare a map to hold private properties
    private static privates = new WeakMap<object, PrivateData>();
    private constructor(
        oAuthClients: OAuthClients,
        network: "Mainnet" | "Preprod",
        blockfrostKey: string,
        blockfrostUrl: string,
        redirectPathName: string,
        redirectUri: string,
        web3AuthClientId: string,
    ) {
        // Initialization logic here...
        if (Web3Auth.instance) {
            throw new Error("Instance already exists!");
        }

        this.oAuthClients = oAuthClients;
        this.network = network;
        this.blockfrostKey = blockfrostKey;
        this.blockfrostUrl = blockfrostUrl;
        this.redirectPathName = redirectPathName;
        this.redirectUri = redirectUri;
        this.chainConfig = getChainConfig(network)
        this.cardanoAddress = '';
        this.cardanoWalletAPI = null;
        this.backupFactorKey = null;
        this.isAccountsCreated = false;
        this.status = "not_initialized"
        this.onStatusChange = () => { }
        this.coreKitInstance = new Web3AuthMPCCoreKit(
            {
                web3AuthClientId: web3AuthClientId,
                web3AuthNetwork: web3AuthNetwork,
                chainConfig: this.chainConfig,
                uxMode: 'redirect',
                baseUrl: redirectUri,//window.location.origin,//'http://localhost:3000',//typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:8084',
                redirectPathName: this.redirectPathName//'web3auth/login',
            }
        )


        // Initialize the private properties in the WeakMap
        Web3Auth.privates.set(this, {
            seedPhrase: null,
            cardanoPaymentKey: null,
            cardanoStakeKey: null,
            web3AuthClientId: web3AuthClientId,
        });
        /*  if (instance) {
             console.log("Instance already exists")
             return instance
         }
         instance = this */
    }

    public static getInstance(
        oAuthClients: OAuthClients,
        network: "Mainnet" | "Preprod",
        blockfrostKey: string,
        blockfrostUrl: string,
        redirectPathName: string,
        redirectUri: string,
        web3AuthClientId: string,
    ): Web3Auth {
        if (!Web3Auth.instance) {
            Web3Auth.instance = new Web3Auth(
                oAuthClients, network, blockfrostKey, blockfrostUrl,
                redirectPathName, redirectUri, web3AuthClientId
            );
        }
        return Web3Auth.instance;
    }

    private setStatus(status: Status) {
        this.status = status
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

    async initialize() {
        console.log("initializing", this.status)
        if (this.status !== "not_initialized") {
            return this
        } else {
            this.setStatus("initializing")
        }
        await this.coreKitInstance.init();
        if (this.coreKitInstance.status === "LOGGED_IN") {
            this.setStatus("logged_in")
        } else {
            this.setStatus("initialized")
        }
        return this;
    }

    async login(platform: "discord" | "google" | "twitter" | "github" | "discordauth0" | "jwt", jwtToken?: string) {
        console.log("logging in")
        localStorage.setItem("walletName", "web3auth");
        localStorage.setItem("blockchain", "cardano");
        if (platform === "jwt" && jwtToken) {
            const sub = jwt.decode(jwtToken)?.sub;
            if (!sub) throw new Error('sub not found in jwt')
            await this.coreKitInstance.loginWithJWT({
                verifier: "summon-magic-link",
                verifierId: sub as string,
                idToken: jwtToken,
            })
            const dbFactorKey = await getBackupFactorFromDb();
            const existingShares = this.coreKitInstance.getKeyDetails().totalFactors;
            if(dbFactorKey){
                await this.coreKitInstance.inputFactorKey(dbFactorKey);
            }else{
                const newFactor = await this.coreKitInstance.createFactor({
                    shareType: TssShareType.RECOVERY,
                    factorKey: generateFactorKey().private,
                });
                await saveBackupFactorKeyToDb(newFactor);
                await this.coreKitInstance.inputFactorKey(newFactor);
            } 

            if (this.coreKitInstance.status === COREKIT_STATUS.REQUIRED_SHARE && existingShares < 3) {
                this.criticalResetAccount()
                throw new Error("Critical reset account, please login again")
            }
            
            /* if (this.coreKitInstance.status === "LOGGED_IN") {
                await this.coreKitInstance.commitChanges(); // Needed for new accounts
            } */
            console.log("after oauth", this.coreKitInstance.status)
            const coreKitStatus = this.coreKitInstance.status
            console.log({ coreKitStatus })
            if (coreKitStatus === "LOGGED_IN") {
                this.setStatus("logged_in")
            }
            return this.coreKitInstance;
        }

        try {
            if (!this.coreKitInstance) {
                throw new Error('error initiated to login');
            }
            const verifierConfig = {
                subVerifierDetails: {
                    typeOfLogin: this.oAuthClients[platform].name,
                    verifier: this.oAuthClients[platform].verifier,
                    clientId: this.oAuthClients[platform].clientId,
                },
            } as SubVerifierDetailsParams;
            if (platform === "github" || platform === "twitter" || platform === "discordauth0") {
                verifierConfig.subVerifierDetails.jwtParams = {
                    // TO DO: change this to specific auth0 domain
                    domain: this.oAuthClients[platform].auth0Domain,
                    connection: platform === "discordauth0" ? "discord" : platform,
                    verifierIdField: 'sub',
                    //scope: 'read:current_user openid profile email',
                }
            }

            await this.coreKitInstance.loginWithOauth(verifierConfig);
            if (this.coreKitInstance.status === "LOGGED_IN") {
                await this.coreKitInstance.commitChanges(); // Needed for new accounts
            }
            console.log("after oauth")
            const coreKitStatus = this.coreKitInstance.status
            console.log({ coreKitStatus })
            if (coreKitStatus === "LOGGED_IN") {
                this.setStatus("logged_in")
            }

        } catch (error: unknown) {
            console.error(error);
        }
        return this.coreKitInstance;
    }

    async initializeBlockchainAccounts() {
        //console.log(await getDeviceShare())
        console.log("initializing blockchain accounts")
        //await this.coreKitInstance.init();
        if (this.status === "not_initialized") {
            throw new Error("corekit instance not initialized yet")
            // await this.initialize()
        }
        //console.log("shares", this.coreKitInstance.getKeyDetails())
        if (this.coreKitInstance.status === "REQUIRED_SHARE" /* COREKIT_STATUS.REQUIRED_SHARE */) {
            throw new Error("required more shares, please enter your backup/ device factor key, or reset account unrecoverable once reset, please use it with caution]");
        } else if (this.coreKitInstance.tKey?.privKey) {
            const mnemonic = keyToMnemonic(ensure64DigitPrivateKey(this.coreKitInstance.tKey.privKey.toString('hex')))
            /* Cardano */
            const { address, stakeAddr, paymentKey, stakeKey } = await createWalletFromMnemonic(mnemonic, this.network)
            this.cardanoAddress = address;

            const privateData = Web3Auth.privates.get(this);
            privateData!.cardanoPaymentKey = paymentKey;
            privateData!.cardanoStakeKey = stakeKey;
            privateData!.seedPhrase = mnemonic

            this.isAccountsCreated = true;
            if (this.status === "api_created") {
                this.setStatus("full_login")
            } else {
                this.setStatus("accounts_created")
            }
            return { cardanoAddress: address, cardanoStakeAddress: stakeAddr }
        } else {
            localStorage.setItem("walletName", "");
            throw new Error('no private key found')
        }
    }

    async UNSAFE_getSeedPhrase() {
        const privateData = Web3Auth.privates.get(this) as any;
        if (!privateData.seedPhrase) {
            throw new Error('Seed phrase not found. Please initialize blockchain accounts first by calling initiateBlockchainAccounts().')
        }
        return privateData.seedPhrase
    }

    async initializeWalletAPI(emulator?: Emulator) {
        const privateData = Web3Auth.privates.get(this) as any;

        if (!privateData.cardanoPaymentKey || !privateData.cardanoStakeKey || !this.network) {
            throw new Error('Cardano keys not found. Please initialize blockchain accounts first by calling initiateBlockchainAccounts().')
        }
        const api = new Web3AuthWalletAPI(privateData.cardanoPaymentKey!, privateData.cardanoStakeKey!, this.network, this.blockfrostUrl, this.blockfrostKey, emulator)
        this.cardanoWalletAPI = api;
        if (this.status === "accounts_created") {
            this.setStatus("full_login")
        } else {
            this.setStatus("api_created")
        }
        return api
    }

    async fullLogin(platform: "discord" | "google" | "twitter" | "github" | "jwt", jwtToken?: string, emulator?: Emulator) {
        await this.initialize()
        console.log("initialized. Logging in")
        await this.login(platform, jwtToken)
        console.log("logged in. Initializing blockchain accounts")
        const blockchainAccounts = await this.initializeBlockchainAccounts()
        const walletAPI = await this.initializeWalletAPI(emulator)
    }

    async getBlockchainAccounts() {
        const privateData = Web3Auth.privates.get(this) as any;
        return await getBlockchainAccounts(this.coreKitInstance, privateData, this.network)
    }

    async getBlockchainBalances() {
        const privateData = Web3Auth.privates.get(this) as any;
        return await getBlockchainBalances(this.coreKitInstance, privateData, this.network)
    }

    //--
    async enableMFA() {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        const factorKey = await this.coreKitInstance.enableMFA({});
        const factorKeyMnemonic = keyToMnemonic(factorKey);

        console.log("MFA enabled, device factor stored in local store, deleted hashed cloud key, your backup factor key: ", factorKeyMnemonic);
        return factorKeyMnemonic;
    };

    async getDeviceFactor() {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        try {
            const factorKey = await getWebBrowserFactor(this.coreKitInstance!);
            this.backupFactorKey = factorKey as string;
            console.log("Device share: ", factorKey);
            return factorKey
        } catch (e) {
            console.log(e);
        }
    };

    async exportMnemonicFactor(): Promise<string> {
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        console.log("export share type: ", TssShareType.RECOVERY);
        const factorKey = generateFactorKey();
        await this.coreKitInstance.createFactor({
            shareType: TssShareType.RECOVERY,
            factorKey: factorKey.private,
        });
        const factorKeyMnemonic = await keyToMnemonic(factorKey.private.toString("hex"));
        console.log("Export factor key mnemonic: ", factorKeyMnemonic);
        return factorKeyMnemonic
    };

    async logout() {
        const privateData = Web3Auth.privates.get(this) as any;

        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance not found");
        }
        await this.coreKitInstance.logout();
        this.setStatus("initialized")
        privateData.ethProvider = null
        privateData.seedPhrase = null
        privateData.cardanoPaymentKey = null
        privateData.cardanoStakeKey = null
        privateData.solanaKeyPair = null
    };

    async criticalResetAccount(): Promise<void> {
        // This is a critical function that should only be used for testing purposes
        // Resetting your account means clearing all the metadata associated with it from the metadata server
        // The key details will be deleted from our server and you will not be able to recover your account
        if (!this.coreKitInstance) {
            throw new Error("coreKitInstance is not set");
        }
        //@ts-ignore
        // if (selectedNetwork === WEB3AUTH_NETWORK.MAINNET) {
        //   throw new Error("reset account is not recommended on mainnet");
        // }
        await this.coreKitInstance.tKey.storageLayer.setMetadata({
            privKey: new BN(this.coreKitInstance.metadataKey!, "hex"),
            input: { message: "KEY_NOT_FOUND" },
        });
        console.log("reset");
        this.logout();
    };

    getUserInfo(): UserInfo {
        const user = this.coreKitInstance?.getUserInfo();
        return user
    };

}


//--------------


export const getBlockchainAccounts = async (coreKitInstance: any, privateData: PrivateData, network: Network) => {
    if (!coreKitInstance) {
        console.log("provider not initialized yet");
        return;
    }


    // Get user's Solana public address
    let allAddresses = newEmptyAddresses()
    const cardanoAddress = getAddressesFromKeys(privateData.cardanoPaymentKey!, privateData.cardanoStakeKey!, network).address;


    allAddresses = {
        ...allAddresses,
        cardano: cardanoAddress,
    } as AccountAddresses
    console.log({ allAddresses })
    return allAddresses
}

export const getBlockchainBalances = async (coreKitInstance: any, privateData: PrivateData, network: Network) => {

    if (!coreKitInstance) {
        console.log("provider not initialized yet");
        return;
    }
    const addresses = await getBlockchainAccounts(coreKitInstance, privateData, network)

    const cardanoAddress = getAddressesFromKeys(privateData.cardanoPaymentKey!, privateData.cardanoStakeKey!, network).address;
    const cardanoAssets = await getCardanoAssetsByAddress(cardanoAddress!);

    // balances are returned in ether, sol and ada (not in lovelace, lamports or wei)
    let balance: AccountBalances = newEmptyBalance()
    balance = {
        ...balance,
        isLoading: false,
        assets: {
            ...balance.assets,
            cardano: cardanoAssets,
        }
    }
    return balance
}


export async function updateWeb3AuthAddress(address: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch('/api/user/update-web3auth-address', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ web3AuthAddress: address }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update Web3 auth address');
        }

        const data = await response.json();
        return { success: true, message: data.message };
    } catch (error) {
        logError(error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        };
    }
}


const saveBackupFactorKeyToDb = async (key: string) => {
    await fetch('/api/mpc-backup-factor-key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
    });
}

const getBackupFactorFromDb = async () => {
    const response = await fetch('/api/mpc-backup-factor-key', {
        method: 'GET',
    });
    const data = await response.json();
    return data.key;
}