import AppLayout from "@/components/layout";
import { WalletProvider } from "@/contexts/wallet-context";
import { Web3AuthProvider } from "@/contexts/web3auth-context";
import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";

const queryClient = new QueryClient()

export const oAuthClients: { [key: string]: { name: string, clientId: string, verifier: string, auth0Domain?: string } } = {

}

export default function App({ Component, pageProps }: AppProps) {
  return <>
    <QueryClientProvider client={queryClient}>
      <Web3AuthProvider
        web3AuthClientId={process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID as string}
        redirectUri={typeof window !== 'undefined' ? `${window.location.origin}` : 'http://localhost:3000'}
        redirectPathName={"web3auth/login"}
        oAuthClients={oAuthClients}
        blockfrostKey={process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID as string}
        blockfrostUrl={process.env.NEXT_PUBLIC_BLOCKFROST_URL as string}
        network={process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK as "Mainnet" | "Preprod"} >
        <WalletProvider>
          <SessionProvider>
            <AppLayout>
              <Component {...pageProps} />
            </AppLayout>
          </SessionProvider>
        </WalletProvider>
      </Web3AuthProvider>
    </QueryClientProvider>
  </>;
}
