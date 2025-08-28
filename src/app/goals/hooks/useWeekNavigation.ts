import { useState, useCallback } from "react";
import dayjs from "dayjs";
import { getTodayString } from "../services/localStorageService";

export const useWeekNavigation = () => {
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = getTodayString();
    return dayjs(today).day(0).format("YYYY-MM-DD"); // Start of current week (Sunday)
  });

  const goToPrevWeek = useCallback(() => {
    setSelectedWeekStart((current) => {
      const currentWeek = dayjs(current);
      const prevWeek = currentWeek.subtract(1, "week");
      return prevWeek.format("YYYY-MM-DD");
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedWeekStart((current) => {
      const currentWeek = dayjs(current);
      const nextWeek = currentWeek.add(1, "week");
      return nextWeek.format("YYYY-MM-DD");
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    const today = getTodayString();
    const currentWeekStart = dayjs(today).day(0).format("YYYY-MM-DD");
    setSelectedWeekStart(currentWeekStart);
  }, []);

  const isCurrentWeek = dayjs(selectedWeekStart).isSame(
    dayjs(getTodayString()).day(0),
    "day"
  );

  return {
    selectedWeekStart,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    isCurrentWeek,
  };
};
