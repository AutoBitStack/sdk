import { Assets } from "@chainflip/sdk/swap";
import "dotenv/config";

export const RPC = "https://ethereum-sepolia-rpc.publicnode.com"
export const HUB_CONTRACT = "0xB34CAF81D30D945B7E1930991d49B8577A4dCdC8";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000".toLowerCase();
export const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST as string,
    port: Number(process.env.REDIS_PORT),
}
export const QUEUE_NAME_DCA = "autobitstack-dca";
export const QUEUE_NAME_LIMIT = "autobitstack-limit"
export const CORN_PATTERN = [86400000, 604800000, 2592000000]
export const MAP_TOKEN_ADDRESS = {
    "0x0000000000000000000000000000000000000000": Assets.ETH,
    "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": Assets.USDC,
    "0xdc27c60956cb065d19f08bb69a707e37b36d8086": Assets.FLIP,
}