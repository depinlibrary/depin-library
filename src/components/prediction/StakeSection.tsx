import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, DollarSign, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StakeSectionProps {
  predictionId: string;
  isEnded: boolean;
  userVote: "yes" | "no" | null;
  yesLabel: string;
  noLabel: string;
}

const STAKE_AMOUNTS = [1, 5, 10, 25, 50, 100];
const USDC_BASE_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_CHAIN_ID = 8453;

export default function StakeSection({ predictionId, isEnded, userVote, yesLabel, noLabel }: StakeSectionProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [isStaking, setIsStaking] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const stakeAmount = customAmount ? parseFloat(customAmount) : selectedAmount;

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast.error("No wallet detected. Install MetaMask or another EVM wallet.");
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const chainId = await ethereum.request({ method: "eth_chainId" });

      // Switch to Base if needed
      if (parseInt(chainId, 16) !== BASE_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                chainName: "Base",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://mainnet.base.org"],
                blockExplorerUrls: ["https://basescan.org"],
              }],
            });
          } else {
            toast.error("Please switch to Base network");
            return;
          }
        }
      }

      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      toast.success("Wallet connected on Base");
    } catch (err: any) {
      toast.error(err?.message || "Failed to connect wallet");
    }
  };

  const handleStake = async () => {
    if (!selectedSide || !stakeAmount || stakeAmount <= 0) {
      toast.error("Select a side and amount");
      return;
    }
    setConfirmDialog(true);
  };

  const confirmStake = async () => {
    setIsStaking(true);
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No wallet");

      // ERC-20 transfer ABI for USDC (6 decimals)
      const amountInUnits = BigInt(Math.round(stakeAmount * 1e6));
      // This is a placeholder — in production, this calls the prediction market smart contract
      // For now we simulate a USDC approval + stake transaction
      const PREDICTION_CONTRACT = "0x0000000000000000000000000000000000000000"; // Replace with deployed contract

      // Encode approve(spender, amount) for USDC
      const approveData = "0x095ea7b3" +
        PREDICTION_CONTRACT.slice(2).padStart(64, "0") +
        amountInUnits.toString(16).padStart(64, "0");

      // Step 1: Approve USDC spend
      const approveTx = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: USDC_BASE_ADDRESS,
          data: approveData,
        }],
      });

      toast.info("Approval sent. Waiting for stake transaction...");

      // Step 2: Call stake on contract
      // Encode stake(predictionId, side, amount)
      // This is placeholder — real contract call would encode properly
      const stakeData = "0x" + "a694fc3a" +
        amountInUnits.toString(16).padStart(64, "0");

      const stakeTx = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: PREDICTION_CONTRACT,
          data: stakeData,
        }],
      });

      toast.success(`Staked ${stakeAmount} USDC on ${selectedSide === "yes" ? yesLabel : noLabel}! Tx: ${stakeTx.slice(0, 10)}...`);
      setConfirmDialog(false);
    } catch (err: any) {
      const msg = err?.message || "Transaction failed";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsStaking(false);
    }
  };

  if (isEnded) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground font-['Space_Grotesk']">Stake USDC</h3>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">Base L2</span>
        </div>

        <div className="p-5 space-y-4">
          {/* Wallet connection */}
          {!walletConnected ? (
            <Button onClick={connectWallet} variant="outline" className="w-full gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet to Stake
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-muted-foreground">Connected:</span>
                <span className="font-mono font-medium text-foreground">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
              </div>

              {/* Side selection */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Pick your side</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSide("yes")}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      selectedSide === "yes"
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    {yesLabel}
                  </button>
                  <button
                    onClick={() => setSelectedSide("no")}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      selectedSide === "no"
                        ? "bg-destructive text-destructive-foreground ring-2 ring-destructive/30"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    }`}
                  >
                    {noLabel}
                  </button>
                </div>
              </div>

              {/* Amount selection */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Stake amount (USDC)</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {STAKE_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                      className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                        !customAmount && selectedAmount === amt
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Potential payout info */}
              {selectedSide && stakeAmount > 0 && (
                <div className="rounded-lg bg-secondary/30 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Your stake</span>
                    <span className="font-semibold text-foreground">{stakeAmount} USDC</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Side</span>
                    <span className={`font-semibold ${selectedSide === "yes" ? "text-primary" : "text-destructive"}`}>
                      {selectedSide === "yes" ? yesLabel : noLabel}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Network fee</span>
                    <span className="font-medium text-foreground">~$0.01</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleStake}
                disabled={!selectedSide || stakeAmount <= 0}
                className="w-full gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Stake {stakeAmount > 0 ? `${stakeAmount} USDC` : ""}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                Stakes are locked until prediction ends. Winners split the pool proportionally. Powered by USDC on Base.
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Confirmation dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Stake
            </DialogTitle>
            <DialogDescription>
              You are about to stake <span className="font-semibold text-foreground">{stakeAmount} USDC</span> on{" "}
              <span className={`font-semibold ${selectedSide === "yes" ? "text-primary" : "text-destructive"}`}>
                {selectedSide === "yes" ? yesLabel : noLabel}
              </span>. This will require two transactions: an approval and a stake. Stakes are locked until the prediction resolves.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(false)} disabled={isStaking}>
              Cancel
            </Button>
            <Button onClick={confirmStake} disabled={isStaking}>
              {isStaking ? "Processing..." : `Confirm ${stakeAmount} USDC`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
