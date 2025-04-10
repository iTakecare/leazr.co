
/**
 * Generate a signature link for an offer
 */
export const generateSignatureLink = (offerId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/sign/${offerId}`;
};
