export function AlphabetAndNumberValidator(value: string): boolean {
  return /^[a-zA-Z0-9!-/:-@[-`{-~]{1,30}$/.test(value);
}
