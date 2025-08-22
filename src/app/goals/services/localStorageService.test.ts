import {
  LocalStorageService,
  getCurrentDayOfWeek,
  formatDate,
  getTodayString,
} from "./localStorageService";

describe("LocalStorageService Day of Week Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getCurrentDayOfWeek", () => {
    test("should return correct day of week for current date", () => {
      const today = new Date();
      const dayIndex = today.getDay();
      const expectedDays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const expectedDay = expectedDays[dayIndex];

      expect(getCurrentDayOfWeek()).toBe(expectedDay);
    });

    test("should match JavaScript Date.getDay() mapping", () => {
      // Test specific day mappings using jest.spyOn
      const mockGetDay = jest.spyOn(Date.prototype, "getDay");

      // Test Sunday (0)
      mockGetDay.mockReturnValueOnce(0);
      expect(getCurrentDayOfWeek()).toBe("sunday");

      // Test Monday (1)
      mockGetDay.mockReturnValueOnce(1);
      expect(getCurrentDayOfWeek()).toBe("monday");

      // Test Friday (5)
      mockGetDay.mockReturnValueOnce(5);
      expect(getCurrentDayOfWeek()).toBe("friday");

      mockGetDay.mockRestore();
    });
  });

  describe("Date utility functions", () => {
    test("formatDate should return YYYY-MM-DD format", () => {
      const testDate = new Date("2024-01-15T10:30:00Z");
      expect(formatDate(testDate)).toBe("2024-01-15");
    });

    test("getTodayString should return today in YYYY-MM-DD format", () => {
      const today = getTodayString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getGoalsForDay", () => {
    test("should filter goals by day of week correctly", () => {
      const service = LocalStorageService.getInstance();

      // Add goals for different days
      const mondayGoal = service.addGoal("Monday Goal", "Description", [
        "monday",
      ]);
      const fridayGoal = service.addGoal("Friday Goal", "Description", [
        "friday",
      ]);
      const weekdayGoal = service.addGoal("Weekday Goal", "Description", [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ]);

      // Test Monday goals
      const mondayGoals = service.getGoalsForDay("monday");
      expect(mondayGoals).toHaveLength(2);
      expect(mondayGoals.map((g) => g.id)).toContain(mondayGoal.id);
      expect(mondayGoals.map((g) => g.id)).toContain(weekdayGoal.id);
      expect(mondayGoals.map((g) => g.id)).not.toContain(fridayGoal.id);

      // Test Friday goals
      const fridayGoals = service.getGoalsForDay("friday");
      expect(fridayGoals).toHaveLength(2);
      expect(fridayGoals.map((g) => g.id)).toContain(fridayGoal.id);
      expect(fridayGoals.map((g) => g.id)).toContain(weekdayGoal.id);
      expect(fridayGoals.map((g) => g.id)).not.toContain(mondayGoal.id);

      // Test Sunday goals (should only have weekend goals if any)
      const sundayGoals = service.getGoalsForDay("sunday");
      expect(sundayGoals).toHaveLength(0);
    });
  });

  describe("getGoalsWithStatus", () => {
    test("should return correct goals for specific date based on day of week", () => {
      const service = LocalStorageService.getInstance();

      // Add goals for different days
      service.addGoal("Monday Goal", "Description", ["monday"]);
      service.addGoal("Friday Goal", "Description", ["friday"]);

      // Test with a known Monday date (2024-01-15 was a Monday)
      const mondayDate = "2024-01-15";
      const mondayGoals = service.getGoalsWithStatus(mondayDate);
      expect(mondayGoals).toHaveLength(1);
      expect(mondayGoals[0].title).toBe("Monday Goal");

      // Test with a known Friday date (2024-01-19 was a Friday)
      const fridayDate = "2024-01-19";
      const fridayGoals = service.getGoalsWithStatus(fridayDate);
      expect(fridayGoals).toHaveLength(1);
      expect(fridayGoals[0].title).toBe("Friday Goal");

      // Test with a known Sunday date (2024-01-21 was a Sunday)
      const sundayDate = "2024-01-21";
      const sundayGoals = service.getGoalsWithStatus(sundayDate);
      expect(sundayGoals).toHaveLength(0);
    });
  });
});
