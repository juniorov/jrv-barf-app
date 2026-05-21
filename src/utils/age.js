export function calculateAge(birthDate) {
  if (!birthDate) return 0;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const ageInYears = years + (months / 12) + (days / 365);
  
  return Math.max(0, Math.round(ageInYears * 10) / 10);
}

export function calculateRealAge(humanAge) {
  if (!humanAge || humanAge <= 0) return 0;
  if (humanAge <= 15) return humanAge / 15;
  if (humanAge <= 24) return 2;
  return 2 + (humanAge - 24) / 4;
}
