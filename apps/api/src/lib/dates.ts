export function todayShanghaiDateKey(now = new Date()): string {
    const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    return shanghai.toISOString().slice(0, 10)
}
