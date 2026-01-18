/*Regex check for common image extensions at the end of the string. Case-insensitive.*/
export const isValidImageUrl = (url: string) => {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
};
