import { Button } from "@/components/ui/button";
import { useWeb3Auth } from "@/contexts/web3auth-context";

export default function CriticalReset() {
    const {web3Auth} = useWeb3Auth();
  return (
    <div>
      <h1>Critical Reset</h1>
      <Button onClick={() => web3Auth?.criticalResetAccount()}>Reset</Button>
    </div>
  );
}