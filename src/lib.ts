export const getTimeOfToday = (hour: number, minute: number): Date => {
  const date = new Date()
  date.setHours(hour, minute)
  return date
}
