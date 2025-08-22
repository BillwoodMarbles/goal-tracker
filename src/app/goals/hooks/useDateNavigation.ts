"use client";

import { useState, useCallback } from "react";
import { formatDate, getTodayString } from "../services/localStorageService";

export const useDateNavigation = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Navigate to today
  const goToToday = useCallback(() => {
    setSelectedDate(getTodayString());
  }, []);

  // Navigate to previous day
  const goToPrevDay = useCallback(() => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(formatDate(currentDate));
  }, [selectedDate]);

  // Navigate to next day
  const goToNextDay = useCallback(() => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(formatDate(currentDate));
  }, [selectedDate]);

  // Navigate to specific date
  const goToDate = useCallback((date: string | Date) => {
    if (date instanceof Date) {
      setSelectedDate(formatDate(date));
    } else {
      setSelectedDate(date);
    }
  }, []);

  // Check if selected date is today
  const isToday = selectedDate === getTodayString();

  // Check if selected date is in the future
  const isFuture = selectedDate > getTodayString();

  // Format date for display
  const getDisplayDate = useCallback(() => {
    const date = new Date(selectedDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (selectedDate === formatDate(today)) {
      return "Today";
    } else if (selectedDate === formatDate(yesterday)) {
      return "Yesterday";
    } else if (selectedDate === formatDate(tomorrow)) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }, [selectedDate]);

  return {
    selectedDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    goToDate,
    isToday,
    isFuture,
    getDisplayDate,
  };
};
