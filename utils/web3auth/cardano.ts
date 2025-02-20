import { BlockfrostAsset, BlockfrostTransaction, BlockfrostUTXO, CardanoAddressInfo } from "../../types/cardano";
import { TokenBalance, TokenInfo } from "../../types/multichain";
import { Emulator, Lucid, UTxO, WalletApi, fromLabel } from "lucid-cardano"
import { toast } from "sonner";
import { z } from "zod";


export const tokenNameFromUnit = (unit: string) => unit === 'lovelace' ? 'ADA' : tokenNameFromAssetName(unit.replace(unit.slice(0, 56), ""))//Buffer.from(unit.replace(unit.slice(0, 56), ""), "hex").toString("ascii")
export const tokenNameFromAssetName = (assetName: string) => assetName == 'lovelace' ? 'ADA ' : (() => {
    const label = fromLabel(assetName.slice(0, 8));
    const name = (() => {
        const hexName = Number.isInteger(label) ? Buffer.from(assetName.slice(8), "hex").toString("ascii") : Buffer.from(assetName, "hex").toString("ascii");
        return hexName || null;
    })();
    return Number.isInteger(label) ? `(${label}) ${name}` : name
})()

export const getCardanoAddressInfo = async (address: string): Promise<CardanoAddressInfo>=> {
    const result = await fetch(
        `${process.env.NEXT_PUBLIC_BLOCKFROST_URL}/addresses/${address}`,
        {
            headers: {
                project_id: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string,
                "Content-Type": "application/json",
            },
        },
    ).then((res) => res.json());

    if (result.error) {
        if (result.status_code === 400) throw new Error("Invalid Request");
        else if (result.status_code === 500) throw new Error("Internal Error");
        // else address not found because it's a new address
        else {
            return {
                address: address,
                amount: [],
                stake_address: "",
                type: "byron",
                script: false
             }
        }
        // else return Buffer.from(C.Value.new(C.BigNum.from_str('0')).to_bytes()).toString('hex');
    }
    return result
}

const lucidUTXoToBlockfrostUTXO = (utxo: UTxO): BlockfrostUTXO => {
    return {
        tx_hash: utxo.txHash,
        address: utxo.address,
        inline_datum: utxo.datum || "",
        output_index: utxo.outputIndex,
        data_hash: utxo.datumHash || "",
        reference_script_hash: utxo.scriptRef?.script || "",
        block: "",
        amount: Object.keys(utxo.assets).map(key => {
            return {
                unit: key,
                quantity: utxo.assets[key].toString().replace("n", "")
            }
        }),

    }
}

export const getCardanoAddressUtxos = async (address: string, emulator?: Emulator) => {
    let result: BlockfrostUTXO[] = [];
    if (emulator) {
        const utxos: BlockfrostUTXO[] = (await emulator.getUtxos(address)).map((utxo: UTxO) => {
            return lucidUTXoToBlockfrostUTXO(utxo)
        })
        return utxos
    }
    let page = 1// paginate && paginate.page ? paginate.page + 1 : 1;
    const limit = ''//paginate && paginate.limit ? `&count=${paginate.limit}` : '';
    while (true) {
        let pageResult = await fetch(
            `${process.env.NEXT_PUBLIC_BLOCKFROST_URL}/addresses/${address}/utxos?page=${page}${limit}`,
            {
                headers: {
                    project_id: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string,
                    "Content-Type": "application/json",
                },
            },
        ).then((res) => res.json());

        if (pageResult.error) {
            if (pageResult.status_code === 400) throw new Error("Invalid Request");
            else if (pageResult.status_code === 500) throw new Error("Internal Error");
            else {
                pageResult = [];
            }
        }
        result = result.concat(pageResult);
        if (pageResult.length <= 0 /* || paginate */) break;
        page++;
    }
    return result
}

const fromAssetUnit = (unit: string) => {
    const policyId = unit.slice(0, 56);
    const label = fromLabel(unit.slice(56, 64));
    const name = (() => {
        const hexName = Number.isInteger(label) ? unit.slice(64) : unit.slice(56);
        return unit.length === 56 ? '' : hexName || null;
    })();
    return { policyId, name, label };
}

async function batchProcess(items: any, batchSize: number, processFunction: any) {
    let result: any = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map((item: any) => processFunction(item)));
        result = result.concat(batchResults);
    }
    return result;
}


const convertMetadataPropToString = (src: any) => {
    if (typeof src === 'string') return src;
    else if (Array.isArray(src)) return src.join('');
    return null;
};

const linkToSrc = (link: string, base64 = false) => {
    const base64regex =
        /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    if (link.startsWith('https://')) return link;
    else if (link.startsWith('ipfs://'))
        return (
            'https://ipfs.io/ipfs/' +
            link.split('ipfs://')[1].split('ipfs/').slice(-1)[0]
        );
    else if (
        (link.startsWith('Qm') && link.length === 46) ||
        (link.startsWith('baf') && link.length === 59)
    ) {
        return 'https://ipfs.io/ipfs/' + link;
    } else if (base64 && base64regex.test(link))
        return 'data:image/png;base64,' + link;
    else if (link.startsWith('data:image')) return link;
    return null;
};

export const getCardanoAssetsByAddress = async (address: string, options?: { ignoreDetails?: boolean, page?: number, pageLength?: number }) => {
    const allNFTs: any = []
    const ignoreDetails = options && options.ignoreDetails ? options.ignoreDetails : false
    const page = options && options.page ? options.page : 1
    const pageLength = options && options.pageLength ? options.pageLength : 30
    var addressInfo: TokenBalance = { NFTs: [], FTs: [] }
    
    const data = await getCardanoAddressInfo(address)

    if (data && data.amount && data.amount.length > 0) {
        const fungible: TokenInfo[] = [];
        const NFT: TokenInfo[] = [];

        const batchSize = 5; // Adjust the batch size according to the rate limit
        const slicedData = options && options.page ? data.amount.slice((page - 1) * (pageLength || 30), page * (pageLength || 30)) : data.amount
        const assetDetailsPromises = slicedData?.filter((asset: any) => asset.unit !== 'lovelace' && !ignoreDetails)
            .map((asset: any) => () => fetch(`${process.env.NEXT_PUBLIC_BLOCKFROST_URL}/assets/${asset.unit}`, {
                headers: {
                    project_id: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string,
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json()).catch(e => console.log("error fetching asset", e)));

        const assetDetails = await batchProcess(assetDetailsPromises, batchSize, (promise: any) => promise());
        for (let i = 0; i < assetDetails.length; i++) {
            const asset = assetDetails[i];
            // const asset = data.amount[i];

            if (asset) {
                const { policyId, name, label } = fromAssetUnit(asset.asset);
                const hasNFTOnchainMetadata = asset.onchain_metadata &&
                    ((asset.onchain_metadata.version === 2 &&
                        asset.onchain_metadata?.[`0x${policyId}`]?.[`0x${name}`]) ||
                        asset.onchain_metadata);
                const meta = asset.onchain_metadata;

                const isNFT = Number(asset.quantity) == 1 && (hasNFTOnchainMetadata && !label) || label === 222;
                const isFungible = asset.mint_or_burn_count > 1 || !asset.onchain_metadata?.image;

                const image =
                    (meta &&
                        meta.image &&
                        linkToSrc(convertMetadataPropToString(meta.image) || '')) ||
                    (asset.metadata &&
                        asset.metadata.logo &&
                        linkToSrc(asset.metadata.logo, true)) ||
                    '';
                (!isNFT ? fungible : NFT).push({
                    amount: BigInt(data.amount.find((a: any) => a.unit === asset.asset)?.quantity || 0),
                    existingAmount: BigInt(asset.quantity),
                    name: tokenNameFromAssetName(asset.asset_name || "")!,
                    tokenIdOrUnit: asset.asset,
                    metadata: { image, name: asset.metadata?.name || meta?.name, description: asset.metadata?.description || meta?.description },
                    decimals: asset.metadata?.decimals,
                    symbol: asset.metadata?.ticker ? asset.metadata?.ticker : meta?.symbol ? meta?.symbol : tokenNameFromAssetName(asset.asset_name || "")!,
                    tokenAddressOrPolicyId: policyId,
                });

                /* if (meta) {
                    allNFTs.push(asset);
                } */
            }
        }

        addressInfo.NFTs = NFT
        addressInfo.FTs = fungible
        const lovelaceAsset = data.amount.find((asset: any) => asset.unit === 'lovelace');
        if (lovelaceAsset) {
            addressInfo.balance = {amount:BigInt(lovelaceAsset.quantity), decimals:6};
        }

    }
    /* const count = data.amount? data.amount.length : 0
    addressInfo.count = count */
    return addressInfo;
}

export const getBlockfrostTransactions = async (walletAddress: string, page: number, pageLength: number): Promise<BlockfrostTransaction[]> => {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_BLOCKFROST_URL}/addresses/${walletAddress}/transactions?page=${page}&count=${pageLength}&order=desc`, {
        headers: { project_id: process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string },
    }).then((res) => res.json());
    if (resp.error) throw new Error(resp.error)
    return resp
}


export const tokenSchema = z.object({
    name: z.string(),
    tokenIdOrUnit: z.string().min(2, {
        message: "Token ID must be at least 2 characters.",
    }),
    amount: z.preprocess((val) => {
        if (typeof val === 'string') {
            return parseFloat(val);
        }
        return val;
    }, z.number().gt(0, {
        message: "Amount must be greater than 0.",
    })),
    ownedAmountWithoutDecimals: z.bigint().min(BigInt(0), {
        message: "You don't own any of this token.",
    }),
    decimals: z.number().min(0, {
        message: "Decimals must be at least 0.",
    }),
    metadata: z.object({
        image: z.string()
    })
})

export const receiverSchema = z.object({
    receiver: z.string()
        .min(2, {
            message: "Receiver must be at least 2 characters.",
        })
        .startsWith(process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK === "Mainnet" ? "addr1" : "addr_test1", {
            message: "Receiver is not a valid Cardano Address",
        }),
    amount: z.preprocess((val) => {
        if (typeof val === 'string') {
            return parseFloat(val);
        }
        return val;
    }, z.number()),
    tokens: z.array(
        tokenSchema
    ),
}).superRefine((data, ctx) => {
    // Check if the amount is 0 and the tokens array is empty
    if (data.amount === 0 && data.tokens.length === 0) {
        ctx.addIssue({
            code: 'custom',
            path: ['amount'], // Specify the path to the field where the error should be attached
            message: "Amount must be greater than 0 unless tokens are specified."
        });
    }
});

export const formSchema = z.object({
    receivers: z.array(
        receiverSchema
    )

});

export const formatReceiverAssets = (assets: z.infer<typeof tokenSchema>[]) => {
    const formatted = assets.reduce((acc, asset) => {
        if (asset.amount > 0) {
            acc[asset.tokenIdOrUnit] = BigInt(asset.amount * 10 ** asset.decimals);
        }
        return acc;
    }, {} as { [key: string]: bigint })
    return formatted
}

export async function createNewCardanoTransaction(lucid: Lucid, walletApi: WalletApi,  values: { receivers: { receiver: string; amount: number; tokens: z.infer<typeof tokenSchema>[] }[] }, afterSubmit?:()=>any) {
    lucid?.selectWallet(walletApi)
    const tx = lucid?.newTx()
    for (const receiver of values.receivers) {
        const assets = formatReceiverAssets(receiver.tokens)
        if (receiver.amount > 0) {
            assets["lovelace"] = BigInt(receiver.amount * 10 ** 6)
        }
        tx?.payToAddress(receiver.receiver, assets)
    };
    const txComplete = await tx?.complete()
    const signedTx = await txComplete?.sign().complete()
    const txHash = await signedTx?.submit()
    if (txHash) {
        console.log(txHash)
        toast.success("Transaction submitted!", {
            description: txHash,
            /* action: {
              label: "Undo",
              onClick: () => console.log("Undo"),
            }, */
        })
        if(afterSubmit){
            afterSubmit()
        }
    } else {
        toast.error("Error", {
            description: "There was an error submitting the transaction",
        })
    }
}

