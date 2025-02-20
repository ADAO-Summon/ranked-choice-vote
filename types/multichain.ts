import { BLOCKCHAINS } from "@/utils/web3auth/multichain";

export type TokenMetadata = {
    image: string,
    name: string,
    attributes?: string[],
    description: string,
    symbol?: string,

}


export type TokenInfo = {
    tokenAddressOrPolicyId?: string, // for evm
    tokenIdOrUnit: string, // this corresponds to unit in cardano (policy ID + asset name), or just tokenIdOrUnit in evm
    token_hash?: string,
    amount: bigint,         //amount owned by the user?
    existingAmount?: bigint, //This is the existing on-chain supply of the token. quantity for cardano, amount for evm? 
    contract_type?: string,
    name: string,          //readable name
    decimals?: number,     //for fungible tokens?
    symbol?: string, // for fungible tokens?
    metadata?: TokenMetadata,
}

export type TokenBalance = {
    NFTs: TokenInfo[],
    FTs: TokenInfo[],
    balance?: {amount:bigint, decimals: number} // amount of lovelaces, or wei, etc.
}

// Define a type that represents all possible values of the CURRENCIES array
export type Blockchain = typeof BLOCKCHAINS[number];