"use client";

import React, { useState } from "react";
import { Box } from "@mui/material";
import { Location } from "../types";
import { PlacesList } from "./PlacesList";
import { InventoryList } from "./InventoryList";

export const InventoryPage: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<
    Location | undefined
  >();
  const [activeTab, setActiveTab] = useState<"places" | "things">("things");

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setActiveTab("things");
  };

  const handleBackToPlaces = () => {
    setSelectedLocation(undefined);
    setActiveTab("places");
  };

  const handleTabChange = (tab: "places" | "things") => {
    setActiveTab(tab);
    if (tab === "places") {
      setSelectedLocation(undefined);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {activeTab === "places" ? (
        <PlacesList
          onLocationSelect={handleLocationSelect}
          selectedLocation={selectedLocation}
          onBack={handleBackToPlaces}
        />
      ) : (
        <InventoryList showAddButton={true} />
      )}
    </Box>
  );
};
