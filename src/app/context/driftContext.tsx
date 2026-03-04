import React, { createContext, useContext, useEffect, useState } from 'react';
import { DriftClient, User } from '@drift-labs/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

interface DriftContextType {
  client: DriftClient | null;
  users: User[];
  refreshAccounts: () => Promise<void>;
}

const DriftContext = createContext<DriftContextType>({
  client: null,
  users: [],
  refreshAccounts: async () => {},
});

export const DriftProvider: React.FC<{ children: React.ReactNode; rpcUrl: string }> = ({
  children,
  rpcUrl,
}) => {
  const [client, setClient] = useState<DriftClient | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // initialize Drift client once
  useEffect(() => {
    const connection = new Connection(rpcUrl);
    const driftClient = new DriftClient({
      connection,
      env: 'mainnet-beta',
      accountSubscription: {
        type: 'polling', // polling mode only
        accountLoader: undefined,
      },
    });

    setClient(driftClient);
  }, [rpcUrl]);

  // function to manually fetch accounts
  const refreshAccounts = async () => {
    if (!client) return;

    try {
      await client.fetchAccounts(); // fetch all user accounts
      const allUsers = client.getUsers(); // read users from client
      setUsers(allUsers);
    } catch (err) {
      console.error('[DriftContext] Error refreshing positions:', err);
    }
  };

  // poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshAccounts, 5000);
    return () => clearInterval(interval);
  }, [client]);

  return (
    <DriftContext.Provider value={{ client, users, refreshAccounts }}>
      {children}
    </DriftContext.Provider>
  );
};

// hook to access Drift context
export const useDrift = () => useContext(DriftContext);