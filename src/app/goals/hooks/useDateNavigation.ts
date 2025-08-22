"use client";

import { useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  formatDate,
  getTodayString,
  getCurrentDayOfWeek,
} from "../services/localStorageService";

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
    const selectedDay = dayjs(selectedDate);
    const today = dayjs();
    const yesterday = today.subtract(1, "day");
    const tomorrow = today.add(1, "day");

    if (selectedDate === today.format("YYYY-MM-DD")) {
      return "Today - " + selectedDay.format("dddd");
    } else if (selectedDate === yesterday.format("YYYY-MM-DD")) {
      return "Yesterday - " + selectedDay.format("dddd");
    } else if (selectedDate === tomorrow.format("YYYY-MM-DD")) {
      return "Tomorrow - " + selectedDay.format("dddd");
    } else {
      return selectedDay.format("dddd");
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
