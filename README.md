# AutoBitStack

AutoBitStack is a cryptocurrency investment platform that allows users to invest in Bitcoin using Dollar-Cost Averaging (DCA) and limit orders.

## Overview
- [View Smart Contract Here](https://github.com/AutoBitStack/sdk/blob/main/src/AutoBitStack.sol)
- [Go to dapp here](https://autobitstack.akbaridria.xyz/)

## Features

- **Dollar-Cost Averaging (DCA)**: Automatically invest in Bitcoin at regular intervals.
- **Limit Orders**: Set target prices for Bitcoin purchases.
- **Smart Contract Integration**: Secure order creation and management.
- **Automated Execution**: Server-side processing for timely order execution.

## How It Works

### DCA Flow

1. User creates a DCA order on our hub_contract.
2. Our server listens for contract events.
3. When an event is detected, a cronjob is pushed using BullMQ.
4. A worker executes the Bitcoin purchase at the specified intervals.

### Limit Order Flow

1. User creates a limit order on our hub_contract.
2. Our server posts a job to a repeatable queue (running every minute).
3. The job checks the current Bitcoin price.
4. If the price is within the target range, it executes the buying order.

```mermaid
graph TD
    A[Start] --> B[User creates order on hub_contract]
    B --> C{Order type}
    C -->|DCA| D[Listen for contract event]
    C -->|Limit| E[Add job to repeatable queue]
    D --> F[Detect event]
    F --> G[Push cronjob to BullMQ]
    G --> H[Worker picks up job]
    H --> I[Execute Bitcoin purchase]
    I --> J[Update order status]
    E --> K[Check Bitcoin price every minute]
    K --> L{Price in target range?}
    L -->|Yes| M[Execute Bitcoin purchase]
    L -->|No| K
    M --> N[Update order status]
    J --> O[End]
    N --> O[End]
