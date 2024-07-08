import { Queue } from "bullmq";
import { CORN_PATTERN, QUEUE_NAME_DCA, QUEUE_NAME_LIMIT, REDIS_CONNECTION } from "./constant";
import { getDcaOrderById } from "./contract-interaction";

export const queueDCA = new Queue(QUEUE_NAME_DCA, {
    connection: REDIS_CONNECTION,
});

export const queueLimit = new Queue(QUEUE_NAME_LIMIT, {
    connection: REDIS_CONNECTION,
});

export const addDcaJob = async (orderId: string, every: number, limit: number) => {
    const job = await queueDCA.add(
        "dca-" + orderId,
        { orderId: orderId },
        {
            attempts: Number.MAX_SAFE_INTEGER,
            repeat: {
                every: every,
                limit: limit
            },
            delay: every,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnFail: false,
            removeOnComplete: true,
            repeatJobKey: orderId,
        }
    );
    return job.repeatJobKey ?? orderId;
};

export const removeDcaJob = async (orderId: string) => {
    const res = await getDcaOrderById(orderId);
    await queueDCA.removeRepeatable("dca-" + orderId, { every: CORN_PATTERN[Number(res.frequency)], limit: Number(res.totalFrequency) });
};

export const addLimitJob = async (orderId: string) => {
    const job = await queueLimit.add(
        "limit-" + orderId,
        { orderId: orderId },
        {
            attempts: Number.MAX_SAFE_INTEGER,
            repeat: {
                every: 60000,
            },
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnFail: false,
            removeOnComplete: true,
            repeatJobKey: orderId,
        }
    );
    return job.id ?? orderId;
};

export const removeLimitJob = async (orderId: string) => {
    await queueLimit.removeRepeatable("limit-" + orderId, { every: 60000 });
};
