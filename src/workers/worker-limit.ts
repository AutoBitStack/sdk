import { Job, Worker } from "bullmq";
import { QUEUE_NAME_LIMIT, REDIS_CONNECTION } from "../constant";
import { getLimitOrderById } from "../contract-interaction";
import { executeSwap, getBTCPrice } from "../chainflip-interaction";

const worker = new Worker(
    QUEUE_NAME_LIMIT,
    async (job: Job<{ orderId: string }>) => {
        try {
            const res = await getLimitOrderById(job.data.orderId);
            if (!res.isActive || Number(res.amount) === 0) {
                return;
            }
            const tolerancePercentage = 0.01 // 1% in the next feature it should be manage by users
            const priceTarget = Number(res.priceTarget) / 1e4;
            const btcPrice = await getBTCPrice();
            const lowerBound = btcPrice * (1 - tolerancePercentage);
            const upperBound = btcPrice * (1 + tolerancePercentage);
            if (priceTarget >= lowerBound && priceTarget <= upperBound) {
                await executeSwap(job.data.orderId, BigInt(res.amount).toString(), res.btcAddress, res.tokenAddress, "limit")
            }

        } catch (error) {
            console.log(error);
            throw error;
        }
    },
    {
        connection: REDIS_CONNECTION,
        autorun: false,
    }
);

worker.run();
