/**
 * Build public contract signature URL
 * Format: https://leazr.co/{companySlug}/contract/{token}/sign
 */
export function buildPublicContractSignatureUrl(companySlug: string, token: string): string {
  const baseUrl = 'https://leazr.co';
  return `${baseUrl}/${companySlug}/contract/${token}/sign`;
}
