import {
    SwapSDK,
    ChainflipNetworks,
    DepositAddressRequest,
    Assets,
    Chains,
} from "@chainflip/sdk/swap";
import { Wallet, ethers } from "ethers";
import { MAP_TOKEN_ADDRESS, RPC } from "./constant";
import { executeDcaSwap, executeLimitSwap } from "./contract-interaction";
import { insertStatus } from "./database";
import "dotenv/config";

const provider = new ethers.JsonRpcProvider(RPC);
const options = {
    network: ChainflipNetworks.perseverance, // Testnet
    signer: new Wallet(process.env.PRIVATE_KEY as string, provider),
};

const swapSDK = new SwapSDK(options);

export const executeSwap = async (
    orderId: string,
    amount: string,
    destAddress: string,
    tokenAddress: string,
    type_product: string = "dca"
) => {
    const depositAddress: DepositAddressRequest = {
        amount: amount,
        destAddress: destAddress,
        destAsset: Assets.BTC,
        destChain: Chains.Bitcoin,
        srcAsset: MAP_TOKEN_ADDRESS[tokenAddress.toLowerCase() as keyof typeof MAP_TOKEN_ADDRESS],
        srcChain: Chains.Ethereum,
    };
    const depRes = await swapSDK.requestDepositAddress(depositAddress);
    if (type_product === "dca") {
        await executeDcaSwap(orderId, depRes.depositAddress);
    } else {
        await executeLimitSwap(orderId, depRes.depositAddress);
    }
    await insertStatus(orderId, depRes.depositChannelId);
};

export const getBTCPrice = async () => {
    const res = await swapSDK.getQuote({
        amount: 1e8.toString(),
        destAsset: Assets.USDC,
        destChain: Chains.Ethereum,
        srcAsset: Assets.BTC,
        srcChain: Chains.Bitcoin,
    });
    const egressAmount = Number(res.quote.egressAmount);
    const includedFees = Number(res.quote.includedFees[1].amount) + Number(res.quote.includedFees[2].amount);
    return (egressAmount + includedFees) / 1e6;
};
