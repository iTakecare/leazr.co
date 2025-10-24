
// VIES VAT number verification service
// This Edge Function connects to the official European Commission VIES service

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VIES SOAP service endpoint
const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

// XML SOAP request template
const createViesRequestXML = (countryCode: string, vatNumber: string) => `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:checkVat>
         <urn:countryCode>${countryCode}</urn:countryCode>
         <urn:vatNumber>${vatNumber}</urn:vatNumber>
      </urn:checkVat>
   </soapenv:Body>
</soapenv:Envelope>
`;

// Improved XML parser function to extract values from SOAP response
const extractValueFromXml = (xml: string, tagName: string): string | null => {
  // Use a more robust regex pattern that works better with namespaces
  const pattern = new RegExp(`<(?:[^:>]+:)?${tagName}>([\\s\\S]*?)<\/(?:[^:>]+:)?${tagName}>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
};

// Function to check if the XML contains a fault
const hasFault = (xml: string): boolean => {
  return xml.includes('<faultstring>') || xml.includes('<faultcode>') || 
         xml.includes(':faultstring>') || xml.includes(':faultcode>');
};

// Function to extract fault message
const extractFaultMessage = (xml: string): string => {
  const fault = extractValueFromXml(xml, 'faultstring');
  return fault || "Unknown VIES service error";
};

serve(async (req: Request) => {
  console.log("VIES Verification Function invoked");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per minute
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const rateLimit = await checkRateLimit(
      supabase,
      clientIp,
      'company-lookup',
      { maxRequests: 10, windowSeconds: 60 }
    );

    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        valid: false,
        error: 'Trop de requêtes. Veuillez réessayer dans une minute.',
        retryAfter: 60
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimit.remaining.toString()
        }
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse the request body
    const requestData = await req.json();
    console.log("Request data received:", requestData);
    
    const { vatNumber = '', country = '' } = requestData;

    if (!vatNumber || !country) {
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Missing required fields: vatNumber and country are required'
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Prepare country code and VAT number
    let countryCode = country;
    let cleanVatNumber = vatNumber.replace(/[^a-zA-Z0-9]/g, '');
    
    // Extract country code if part of the VAT number
    if (cleanVatNumber.length >= 2 && /^[A-Z]{2}/i.test(cleanVatNumber)) {
      countryCode = cleanVatNumber.substring(0, 2).toUpperCase();
      cleanVatNumber = cleanVatNumber.substring(2);
    }
    
    console.log(`Verifying VAT number: ${cleanVatNumber} for country: ${countryCode}`);

    try {
      // Create SOAP request
      const soapRequest = createViesRequestXML(countryCode, cleanVatNumber);
      console.log("SOAP request:", soapRequest);
      
      // Send request to VIES with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(VIES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml;charset=UTF-8', 'SOAPAction': '' },
        body: soapRequest,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`VIES API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`VIES API error: ${response.status} ${response.statusText}`);
        
        // Try to get error details from response
        const errorText = await response.text();
        console.error(`VIES API error response: ${errorText}`);
        
        return new Response(JSON.stringify({ 
          valid: false,
          error: `VIES service error: ${response.statusText || 'Unknown error'}`
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Parse XML response
      const xmlText = await response.text();
      console.log("VIES response received (sample):", xmlText.substring(0, 200) + "...");
      
      // Check if response is empty or invalid
      if (!xmlText || xmlText.length < 50) {
        console.error("Empty or invalid XML response:", xmlText);
        return new Response(JSON.stringify({ 
          valid: false,
          error: "VIES service returned an empty or invalid response"
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Check if response contains a fault
      if (hasFault(xmlText)) {
        const faultReason = extractFaultMessage(xmlText);
        console.error("VIES service returned a fault:", faultReason);
        
        return new Response(JSON.stringify({ 
          valid: false,
          error: `VIES service error: ${faultReason}`
        }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Extract data using our XML parser
      // In SOAP responses, tags can be prefixed with namespaces like "ns2:valid"
      const isValid = (extractValueFromXml(xmlText, 'valid')?.toLowerCase() === 'true');
      const companyName = extractValueFromXml(xmlText, 'name') || "";
      const address = extractValueFromXml(xmlText, 'address') || "";
      
      console.log(`VIES validation result: valid=${isValid}, name=${companyName}, address=${address}`);
      
      // Return the validation result
      return new Response(JSON.stringify({
        valid: isValid,
        companyName,
        address
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (fetchError) {
      console.error("VIES fetch error:", fetchError.message || fetchError);
      return new Response(JSON.stringify({ 
        valid: false,
        error: `Connection error: ${fetchError.message || "Failed to connect to VIES service"}`
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("VIES verification error:", error.message || error);
    return createErrorResponse(error, corsHeaders);
  }
});
