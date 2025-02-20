import { TokenBalance } from "@/types/multichain"

export const BLOCKCHAINS = ['cardano', 'polygon', 'solana', 'vechain', 'bitcoin'] as const
export const BLOCKCHAIN_CURRENCIES = {
    cardano: 'ADA',
    polygon: 'MATIC',
    solana: 'SOL',
    vechain: 'VET',
    bitcoin: 'BTC'
} as const

export const newEmptyBalance = () => {
    const assetBlockchains = BLOCKCHAINS.reduce((acc, blockchain) => {
        acc[blockchain] = { balance: {amount:BigInt(0), decimals: 0}, FTs: [], NFTs: [] }
        return acc
    }, {} as Record<typeof BLOCKCHAINS[number], TokenBalance>)
    return ({
        isLoading: true,
        assets: assetBlockchains
    })
}

export const newEmptyAddresses = () => {
    return BLOCKCHAINS.reduce((acc, blockchain) => {
        acc[blockchain] = null
        return acc
    }, {} as Record<typeof BLOCKCHAINS[number], string | null>)
}