export function maskNumber(value: string, visible = 4): string {
  const digits = value.replace(/\D/g, '');
  const tail = digits.slice(-visible);
  return `•••• •••• •••• ${tail}`;
}

export function groupDigits(value: string, size = 4): string {
  const digits = value.replace(/\D/g, '');
  return digits.match(new RegExp(`.{1,${size}}`, 'g'))?.join(' ') ?? '';
}
