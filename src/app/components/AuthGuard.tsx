"use client";

import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import { useSupabaseAuth } from "../contexts/SupabaseAuthContext";
import AuthModal from "./AuthModal";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useSupabaseAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setAuthModalOpen(true);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <>
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          gap={2}
          p={3}
        >
          <Typography variant="h5" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Please sign in to access your goals.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setAuthModalOpen(true)}
            size="large"
          >
            Sign In / Sign Up
          </Button>
        </Box>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}

