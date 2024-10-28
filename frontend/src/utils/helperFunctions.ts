export const mapNumberToLetter = (num: number): string => {
  if (num < 1) {
    throw new Error("Input must be a positive number");
  }

  let result = "";
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }

  return result;
};
