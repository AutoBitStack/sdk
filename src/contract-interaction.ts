import { Wallet, ethers } from "ethers";
import { HUB_CONTRACT, RPC } from "./constant";
import abi from "./abi.json";

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new Wallet(process.env.PRIVATE_KEY ?? "", provider)
const contract = new ethers.Contract(HUB_CONTRACT, abi, wallet);

export const getDcaOrderById = async (id: string) => {
    const res = await contract.dcaOrders(id);
    return res;
}

export const getLimitOrderById = async (id: string) => {
    const res = await contract.limitOrders(id);
    return res;
}

export const executeDcaSwap = async (orderId: string, destAddress: string) => {
    const tx = await contract.updateDCAOrder(orderId, destAddress);
    await tx.wait();
}

export const executeLimitSwap = async (orderId: string, destAddress: string) => {
    const tx = await contract.fulfillLimitOrder(orderId, destAddress);
    await tx.wait();
}