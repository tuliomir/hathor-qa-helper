# Hathor QA Helper

A comprehensive testing and quality assurance tool for the Hathor blockchain ecosystem clients. This web application enables developers and QA engineers to test Mobile and Desktop Wallets functionality, RPC methods, and nano contracts interactively.

![Sample initial screen](docs/sample%20initial%20screen.png)

## Features

### Wallet Management
- **Multi-wallet support** - Manage multiple wallets simultaneously (funding + test wallets)
- **Wallet initialization** - Create wallet instances with seed phrases
- **OCR integration** - Extract seed words from screenshots or camera captures
- **Address validation** - Verify addresses from initialized wallets
- **Custom tokens** - View and manage custom tokens with balances
- **Transaction history** - Browse transaction records

### RPC Integration (via WalletConnect)
- **Get Balance** - Query token balances via RPC
- **Sign with Address** - Test message signing functionality
- **Create Token** - Create new custom tokens with mint/melt authorities
- **Sign Oracle Data** - Sign data for nano contract oracles
- **Dry Run Mode** - Test RPC calls without actual blockchain execution

### Nano Contract Testing (Betting)
- **Initialize Bet** - Set up bet nano contracts with oracle and token configuration
- **Place Bet** - Deposit funds into existing bet contracts
- **Set Bet Result** - Oracle operation to determine bet outcomes
- **Withdraw Prize** - Claim winnings from completed bets

### Monitoring
- **Real-time event stream** - Monitor wallet events (new-tx, update-tx, state changes)

## Tech Stack

- **React 19** with TypeScript
- **Vite** (rolldown-vite) for bundling
- **Redux Toolkit** for state management
- **Tailwind CSS** + **DaisyUI** for styling
- **@hathor/wallet-lib** for blockchain integration
- **WalletConnect v2** for mobile/desktop wallet connection
- **Tesseract.js** for OCR functionality

## Getting Started

### Prerequisites

- Node.js 22+
- Bun is recommended, yarn otherwise.

### Installation

```bash
# Clone the repository
git clone https://github.com/HathorNetwork/qa-helper.git
cd qa-helper

# Install dependencies
bun install

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
bun run build
```

### Linting

```bash
bun run lint
bun run lint:fix
```

## Usage

1. **Initialize a wallet** - Enter a seed phrase or use OCR to extract words from an image
2. **Set wallet roles** - Designate wallets as "Funding" or "Test" for different operations
3. **Connect via WalletConnect** - Establish connection with your mobile/desktop wallet
4. **Run tests** - Navigate through stages in the sidebar to test different functionality
5. **Monitor events** - Use the Tx Update Events stage to watch real-time wallet activity

## Project Structure

```
src/
├── components/
│   ├── stages/      # QA test stage components
│   ├── rpc/         # RPC method test cards
│   ├── common/      # Shared UI components
│   └── ui/          # Reusable UI components
├── store/
│   ├── slices/      # Redux slices
│   └── selectors/   # Memoized selectors
├── hooks/           # Custom React hooks
├── services/        # Business logic (RPC handlers, WalletConnect)
├── utils/           # Helper functions
├── constants/       # Configuration constants
└── types/           # TypeScript definitions
```

## License

MIT
