import { ContractEventPayload, ethers } from "ethers";
import { RPC, HUB_CONTRACT, CORN_PATTERN } from "./constant";
import abi from "./abi.json";
import { addDcaJob, addLimitJob, removeDcaJob, removeLimitJob } from "./queue";
import { insertHub } from "./database";
import { getDcaOrderById } from "./contract-interaction";

const contractABI = abi;
const contractAddress = HUB_CONTRACT; // Address of your deployed contract

// Initialize Ethereum provider
const provider = new ethers.JsonRpcProvider(RPC);

// Connect to the contract
const contract = new ethers.Contract(contractAddress, contractABI, provider);

// Function to process Event1
async function createDCAOrder(event: ContractEventPayload) {
  console.log('DCA Created: ');
  console.log('by ', event.args[0])
  console.log('orderId ', event.args[1])

  const res = await getDcaOrderById(event.args[1]);
  const jobid = await addDcaJob(event.args[1], CORN_PATTERN[Number(res.frequency)], Number(res.totalFrequency));
  await insertHub(event.args[1], jobid, event.args[0], "dca");
}

async function cancelDCAOrder(event: ContractEventPayload) {
    console.log('DCA Order Cancelled: ');
    console.log('by ', event.args[0]);
    console.log('orderId ', event.args[1]);
    
    removeDcaJob(event.args[1]);
}

async function completeDCAOrder(event: ContractEventPayload) {
    console.log('DCA Order Completed');
    console.log('by ', event.args[0]);
    console.log('orderId ', event.args[1]);

    removeDcaJob(event.args[1]);
}

async function createLimitOrder(event: ContractEventPayload) {
    console.log('Limit Order Created');
    console.log('by ', event.args[0]);
    console.log('orderId ', event.args[1]);

    const jobid = await addLimitJob(event.args[1]);
    await insertHub(event.args[1], jobid, event.args[0], "limit");
}

async function cancelLimitOrder(event: ContractEventPayload) {
    console.log('Limit Order Cancelled');
    console.log('by ', event.args[0]);
    console.log('orderId ', event.args[1]);

    removeLimitJob(event.args[1]);
}

async function fulfillLimitOrder(event: ContractEventPayload) {
    console.log('Limit Order Fulfilled');
    console.log('by ', event.args[0]);
    console.log('orderId ', event.args[1]);

    removeLimitJob(event.args[1]);
}

// Function to set up event listeners
function setupEventListeners() {
  contract.on("DCAOrderCreated", async (...args) => {
    const event = args[args.length - 1];
    try {
      await createDCAOrder(event);
    } catch (error) {
      console.error('Error processing Event Created DCA:', error);
    }
  });

  contract.on("DCAOrderCancelled", async (...args) => {
    const event = args[args.length - 1];
    try {
      await cancelDCAOrder(event);
    } catch (error) {
      console.error('Error processing Event Cancel DCA:', error);
    }
  });

  contract.on("DCAOrderCompleted", async (...args) => {
    const event = args[args.length - 1];
    try {
      await completeDCAOrder(event);
    } catch (error) {
      console.error('Error processing Event Completed DCA:', error);
    }
  });

  contract.on("LimitOrderCreated", async (...args) => {
    const event = args[args.length - 1];
    try {
      await createLimitOrder(event);
    } catch (error) {
      console.error('Error processing Event Created Limit Order:', error);
    }
  });

  contract.on("LimitOrderCancelled", async (...args) => {
    const event = args[args.length - 1];
    try {
      await cancelLimitOrder(event);
    } catch (error) {
      console.error('Error processing Event Cancel Limit Order:', error);
    }
  });

  contract.on("LimitOrderFulfilled", async (...args) => {
    const event = args[args.length - 1];
    try {
      await fulfillLimitOrder(event);
    } catch (error) {
      console.error('Error processing Event Cancel Limit Order:', error);
    }
  });
}

// Set up event listeners
setupEventListeners();

// Keep the process running
process.on('SIGINT', () => {
  console.log('Gracefully shutting down from SIGINT (Ctrl-C)');
  process.exit(0);
});
