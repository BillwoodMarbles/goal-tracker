"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/app/contexts/SupabaseAuthContext";
import AuthModal from "@/app/components/AuthModal";
import { GroupSharp, CalendarMonth, People } from "@mui/icons-material";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

type GroupGoalPreview = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  daysOfWeek: string[];
  memberCount: number;
};

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [token, setToken] = useState<string | null>(null);
  const [groupGoal, setGroupGoal] = useState<GroupGoalPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Load invite details
  useEffect(() => {
    if (!token) return;

    const loadInvite = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/group-invites/${token}`);

        if (!res.ok) {
          if (res.status === 404) {
            setError("Invite not found or expired.");
          } else if (res.status === 410) {
            setError("This invite has been revoked.");
          } else {
            setError("Failed to load invite.");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setGroupGoal(data.groupGoal);
        setError(null);
      } catch (err) {
        console.error("Error loading invite:", err);
        setError("Failed to load invite.");
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  // Auto-join if authenticated
  useEffect(() => {
    if (!user || !groupGoal || authLoading || joining) return;

    const autoJoin = async () => {
      setJoining(true);
      try {
        const res = await fetch(`/api/group-invites/${token}/join`, {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            router.push("/");
          } else {
            setError("Failed to join group goal.");
            setJoining(false);
          }
        } else {
          setError("Failed to join group goal.");
          setJoining(false);
        }
      } catch (err) {
        console.error("Error joining group:", err);
        setError("Failed to join group goal.");
        setJoining(false);
      }
    };

    autoJoin();
  }, [user, groupGoal, authLoading, token, router, joining]);

  const handleJoinClick = () => {
    if (user) {
      // Already handled by auto-join effect
      return;
    }
    setAuthModalOpen(true);
  };

  if (loading || authLoading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (joining) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
          gap={2}
        >
          <CircularProgress />
          <Typography variant="h6" color="text.secondary">
            Joining group goal...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box py={4}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </Box>
      </Container>
    );
  }

  if (!groupGoal) {
    return (
      <Container maxWidth="sm">
        <Box py={4}>
          <Alert severity="error">Group goal not found.</Alert>
        </Box>
      </Container>
    );
  }

  const dayAbbreviations: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };

  return (
    <>
      <Container maxWidth="sm">
        <Box py={4}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: "center",
            }}
          >
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              mb={2}
            >
              <GroupSharp sx={{ fontSize: 48, color: "primary.main" }} />
            </Box>

            <Typography variant="h4" gutterBottom fontWeight="bold">
              {groupGoal.title}
            </Typography>

            {groupGoal.description && (
              <Typography variant="body1" color="text.secondary" paragraph>
                {groupGoal.description}
              </Typography>
            )}

            <Box
              display="flex"
              flexDirection="column"
              gap={2}
              my={3}
              alignItems="center"
            >
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarMonth fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {new Date(groupGoal.startDate).toLocaleDateString()}
                  {groupGoal.endDate && (
                    <> — {new Date(groupGoal.endDate).toLocaleDateString()}</>
                  )}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <People fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {groupGoal.memberCount} member
                  {groupGoal.memberCount !== 1 ? "s" : ""}
                </Typography>
              </Box>

              <Box
                display="flex"
                gap={0.5}
                flexWrap="wrap"
                justifyContent="center"
              >
                {groupGoal.daysOfWeek.map((day) => (
                  <Chip
                    key={day}
                    label={dayAbbreviations[day.toLowerCase()] || day}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleJoinClick}
              sx={{ mt: 2 }}
            >
              {user ? "Joining..." : "Sign In / Sign Up to Join"}
            </Button>

            {!user && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={2}
              >
                You&apos;ll need an account to join this group goal
              </Typography>
            )}
          </Paper>
        </Box>
      </Container>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
