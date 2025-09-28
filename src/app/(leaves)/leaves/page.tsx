"use client";

import React, { useState } from "react";
import { Box } from "@mui/material";
import { FC } from "react";
import { Location } from "../types";
import { PlacesList } from "../components/PlacesList";
import { InventoryList } from "../components/InventoryList";
import { useLeavesContext } from "../components/LeavesProvider";

const Leaves: FC = () => {
  const { activeTab } = useLeavesContext();
  const [selectedLocation, setSelectedLocation] = useState<
    Location | undefined
  >(undefined);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleBackToPlaces = () => {
    setSelectedLocation(undefined);
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
        <InventoryList locationId={selectedLocation?.id} showAddButton={true} />
      )}
    </Box>
  );
};

export default Leaves;
