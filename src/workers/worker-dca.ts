import { Job, Worker } from "bullmq";
import { QUEUE_NAME_DCA, REDIS_CONNECTION } from "../constant";
import { getDcaOrderById } from "../contract-interaction";
import { executeSwap } from "../chainflip-interaction";

const worker = new Worker(
    QUEUE_NAME_DCA,
    async (job: Job<{ orderId: string }>) => {
        try {
            const res = await getDcaOrderById(job.data.orderId);
            if (!res.isActive || Number(res.totalFrequency) === 0) {
                return;
            }
            await executeSwap(job.data.orderId, BigInt(res.amountPerSwap).toString(), res.btcAddress, res.tokenAddress)
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
