"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { LeavesTab } from "../types";
import { LeavesFooter } from "./LeavesFooter";

interface LeavesContextType {
  activeTab: LeavesTab;
  setActiveTab: (tab: LeavesTab) => void;
}

const LeavesContext = createContext<LeavesContextType | undefined>(undefined);

export const useLeavesContext = () => {
  const context = useContext(LeavesContext);
  if (!context) {
    throw new Error("useLeavesContext must be used within a LeavesProvider");
  }
  return context;
};

interface LeavesProviderProps {
  children: ReactNode;
}

export const LeavesProvider: React.FC<LeavesProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<LeavesTab>("things");

  const handleTabChange = (tab: LeavesTab) => {
    setActiveTab(tab);
  };

  return (
    <LeavesContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
      <LeavesFooter activeTab={activeTab} onTabChange={handleTabChange} />
    </LeavesContext.Provider>
  );
};
