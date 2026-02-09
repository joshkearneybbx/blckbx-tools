export function generateGoogleMapsLink(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export function openGoogleMaps(address: string): void {
  const link = generateGoogleMapsLink(address);
  window.open(link, '_blank', 'noopener,noreferrer');
}
