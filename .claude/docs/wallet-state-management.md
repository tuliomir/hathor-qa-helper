# Wallet State Management Best Practices

## Critical Rule: Never Store Complex Wallet Objects in React State

### The Problem

The `HathorWallet` object is a **complex, stateful object** that:

- Changes internally due to network events (new transactions, blocks, etc.)
- Has its own event emitters and listeners
- Maintains internal state (balance, UTXOs, transaction history)
- Can trigger frequent internal updates

**Storing it in React state causes:**

1. **Unnecessary re-renders** - Every internal wallet change could trigger component updates
2. **Stale closures** - Callbacks may capture old wallet references
3. **Performance issues** - React will try to diff large complex objects
4. **Memory leaks** - Old wallet instances may not be properly cleaned up

### The Solution: Use Refs for Complex Objects, State for Specific Properties

## Pattern 1: Store Wallet Instance in a Ref

```tsx
// ✅ CORRECT - Use ref for the wallet instance
const walletRef = useRef<HathorWallet | null>(null);

// ❌ WRONG - Do not use state
const [wallet, setWallet] = useState<HathorWallet | null>(null);
```

**Why?**
- Refs don't trigger re-renders when updated
- The wallet instance persists across renders
- Easy cleanup on unmount

## Pattern 2: Extract Specific Properties into State

Only track the **specific properties** you need for rendering:

```tsx
// ✅ CORRECT - Track only what you need to render
const [walletState, setWalletState] = useState<WalletState>({
  status: 'idle',           // Connection status
  firstAddress?: string,    // Specific address to display
  balance?: number,         // Current balance
  error?: string,           // Error message
});

// ❌ WRONG - Don't track the entire wallet
const [walletData, setWalletData] = useState({
  wallet: walletInstance,   // This includes everything!
  transactions: [...],
  utxos: [...],
  // etc.
});
```

## Pattern 3: Use Refs for Callbacks

Parent component callbacks may change on every render. Use refs to avoid re-initialization:

```tsx
// Store callbacks in refs
const onStatusChangeRef = useRef(onStatusChange);
const onWalletReadyRef = useRef(onWalletReady);

// Update refs when callbacks change (doesn't trigger effects)
useEffect(() => {
  onStatusChangeRef.current = onStatusChange;
  onWalletReadyRef.current = onWalletReady;
}, [onStatusChange, onWalletReady]);

// Use refs in your wallet initialization
useEffect(() => {
  // ... wallet init code ...
  onWalletReadyRef.current?.(walletInstance);
}, [seedPhrase, network]); // No callback dependencies!
```

## Pattern 4: Event Listeners Should Update Specific State

When listening to wallet events, extract only what you need:

```tsx
useEffect(() => {
  const wallet = walletRef.current;
  if (!wallet) return;

  // ✅ CORRECT - Extract specific data
  const handleNewTransaction = (tx: Transaction) => {
    setWalletState((prev) => ({
      ...prev,
      balance: wallet.getBalance(), // Get current value
      lastTxId: tx.id,              // Specific property
    }));
  };

  // ❌ WRONG - Don't store the entire transaction or wallet
  const handleNewTransactionWrong = (tx: Transaction) => {
    setWalletState((prev) => ({
      ...prev,
      wallet: wallet,           // Never do this!
      transaction: tx,          // Too much data
      allTransactions: [...],   // Heavy array
    }));
  };

  wallet.on('new-tx', handleNewTransaction);
  return () => wallet.off('new-tx', handleNewTransaction);
}, []);
```

## Complete Example

```tsx
export function WalletComponent({ seedPhrase, network }: Props) {
  // ✅ Store wallet instance in ref
  const walletRef = useRef<HathorWallet | null>(null);

  // ✅ Track only specific rendering state
  const [state, setState] = useState({
    status: 'idle' as WalletStatus,
    address: '',
    balance: 0,
    error: null as string | null,
  });

  // ✅ Use refs for callbacks
  const callbacksRef = useRef({ onReady, onError });
  useEffect(() => {
    callbacksRef.current = { onReady, onError };
  }, [onReady, onError]);

  // Initialize wallet
  useEffect(() => {
    let mounted = true;

    async function init() {
      const wallet = new HathorWallet({ seed: seedPhrase });
      walletRef.current = wallet;

      await wallet.start();

      if (!mounted) {
        await wallet.stop();
        return;
      }

      // ✅ Extract specific properties for state
      setState({
        status: 'ready',
        address: await wallet.getAddressAtIndex(0),
        balance: wallet.getBalance(),
        error: null,
      });

      callbacksRef.current.onReady?.(wallet);
    }

    init();

    return () => {
      mounted = false;
      walletRef.current?.stop();
    };
  }, [seedPhrase, network]); // Only re-init on seed/network change

  // ✅ Listen to specific wallet events
  useEffect(() => {
    const wallet = walletRef.current;
    if (!wallet) return;

    const updateBalance = () => {
      setState((prev) => ({
        ...prev,
        balance: wallet.getBalance(), // Extract current value
      }));
    };

    wallet.on('balance-update', updateBalance);
    return () => wallet.off('balance-update', updateBalance);
  }, []); // No dependencies - walletRef is stable

  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Address: {state.address}</p>
      <p>Balance: {state.balance}</p>
    </div>
  );
}
```

## Key Takeaways

1. **Never** store `HathorWallet` instances in React state
2. **Always** use `useRef` for wallet instances
3. **Only** store specific, primitive values in state (status, balance, addresses)
4. **Use refs** for callbacks to prevent unnecessary re-initializations
5. **Extract** specific data when listening to wallet events
6. **Keep** useEffect dependencies minimal and stable

## Anti-Patterns to Avoid

```tsx
// ❌ WRONG - All of these are bad!
const [wallet, setWallet] = useState<HathorWallet>(null);
const [transactions, setTransactions] = useState(wallet.getTransactions());
const [walletData, setWalletData] = useState({ ...wallet });

// Even this is problematic:
useEffect(() => {
  // This will re-run if callback changes every render
  wallet.on('event', onCallback);
}, [onCallback]);
```

## When to Update This Pattern

As the application grows, consider:

1. **Context API** - For sharing wallet across components
2. **Custom Hooks** - `useWallet()` to encapsulate this logic
3. **State Management** - Redux/Zustand for complex wallet state
4. **Separation** - Keep wallet instance in context, specific state local to components
