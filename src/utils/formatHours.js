
export const formatHours = (value) => {
    const total = Math.round((Number(value) || 0) * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};