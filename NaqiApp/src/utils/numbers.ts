// Convert Western numerals to Arabic-Indic numerals
export const toArabicNumerals = (num: number): string => {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map(digit => (digit >= '0' && digit <= '9' ? arabicNumerals[parseInt(digit, 10)] : digit))
    .join('');
};
