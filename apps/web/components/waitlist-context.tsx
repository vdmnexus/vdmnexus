"use client";

import { createContext, useContext, useState } from "react";

type WaitlistContextValue = {
  prefilledEmail: string;
  setPrefilledEmail: (value: string) => void;
};

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [prefilledEmail, setPrefilledEmail] = useState("");
  return (
    <WaitlistContext.Provider value={{ prefilledEmail, setPrefilledEmail }}>
      {children}
    </WaitlistContext.Provider>
  );
}

export function useWaitlist() {
  return useContext(WaitlistContext);
}
