import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useWalletContext } from '@/contexts/wallet-context';
import { useWeb3Auth } from '@/contexts/web3auth-context';
import { Toaster } from './ui/sonner';
import {logError} from '@/utils/error-logs';
import { toast } from 'sonner';

const publicRoutes = ['/auth/signin', '/auth/verify-request'];

const AppLayout = ({ children }: any) => {
  const { data: session, status } = useSession();
  const { addresses, connectWallet } = useWalletContext();
  const { web3Auth } = useWeb3Auth();
  const loginAttempts = useRef(0);
  const getJWT = useCallback(async () => {
    const res = await fetch(`/api/getJWT`);
    const data = await res.json();
    return data;
  }, []);

  console.log({ addresses })
  useEffect(() => {
    if (session?.user && web3Auth?.status === "initialized") {
      const web3AuthLogin = async () => {
        console.log("web3authlogin")
        const token = await getJWT();
        const jwt = token.token;

        if (jwt && loginAttempts.current === 0) {
          const storageKey = 'web3auth_login_in_progress';
          const loginTimestamp = Date.now().toString();

          // Set a flag in localStorage with current timestamp
          localStorage.setItem(storageKey, loginTimestamp);

          // Wait for a short time to allow other windows to set their timestamps
          await new Promise(resolve => setTimeout(resolve, 100));

          // Check if this window has the lowest (earliest) timestamp
          const currentTimestamp = localStorage.getItem(storageKey);
          if (currentTimestamp === loginTimestamp) {
            try {
              console.log("Attempting Web3Auth login");
              loginAttempts.current += 1;
              const web3authRes = await web3Auth.fullLogin("jwt", jwt);
             // console.log({ web3authRes });
              console.log("Web3Auth login successful");
              if (web3Auth.status === "full_login") {
                //throw new Error("Web3Auth login failed");
                connectWallet("web3auth", "cardano");
              }
            } catch (error) {
              console.error("Web3Auth login failed:", error);
              logError(error)
             /*  toast.error("Error generating address", {
                description: "An error occurred while generating your cardano address. Please try logging in again.",
                action: {
                  label: "Sign out",
                  onClick: () => signOut(),
                },
                duration: 14000,
              }) */
            } finally {
              // Clear the login flag
              localStorage.removeItem(storageKey);
            }
          } else {
            console.log("Another window is handling the login");
          }
        }
      };

      web3AuthLogin();

    }
  }, [session, web3Auth?.status, getJWT, connectWallet]);

  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated' && !publicRoutes.includes(router.pathname)) {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </nav>
        <main className="flex-grow container mx-auto p-4">
          <Skeleton className="h-[400px] w-full" />
        </main>
        
      </div>
    );
  }

  // For public routes, render a simplified layout
  if (publicRoutes.includes(router.pathname)) {
    return (
      <div className="min-h-screen flex flex-col">
        <nav
          className={`
          bg-[#2d6afd]/90 text-white
          p-4 sticky top-0 z-50 transition-colors duration-300
          backdrop-blur-sm
        `}
        >
          <div className="container mx-auto">
            <div className="flex flex-col space-y-2">
              <Link href="/" className="text-xl font-bold">
                <img className="h-10" src="/intersect-logo.svg" alt="Logo" />
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-grow container mx-auto md:px-6 lg:px-12 p-4">
          {children}
        </main>
        <Toaster />
      </div>
    );
  }

  // For authenticated routes, render the full layout
  return (
    <div className="min-h-screen flex flex-col">
      <nav
        className={`
          bg-[#2d6afd]/90 text-white
          p-4 sticky top-0 z-50 transition-colors duration-300
          backdrop-blur-sm
        `}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex flex-col space-y-2">
            <Link href="/" className="text-xl font-bold">
              <img className="h-10" src="/intersect-logo.svg" alt="Logo" />
            </Link>

          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="hidden md:inline">{session.user.name}</span>
                </div>
                <Button className="bg-transparent" onClick={() => { web3Auth?.logout().then( () => signOut()) }} variant="outline" size="sm">
                  Sign out
                </Button>
              </>
            ) : (
              <Button onClick={() => signIn()} variant="outline" size="sm">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-grow container mx-auto md:px-6 lg:px-12 p-4">
        {children}

      </main>
      <Toaster />
      <div className="flex flex-row space-x-2 items-end z-[-1] fixed bottom-2 right-4 md:bottom-4 md:right-10">
        <span className="text-xs p-0">Powered by</span>
        <Link href="/" className="text-xl font-bold">
          <img className="w-12 pb-[3px]" src="/summon-logo.png" alt="Summon Logo" />
        </Link>
      </div>
    </div>
  );
};

export default AppLayout;