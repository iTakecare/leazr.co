
// VIES VAT number verification service
// This Edge Function connects to the official European Commission VIES service

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

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

// Simple XML parser function to extract values from SOAP response
// This replaces the DOMParser which is causing the error
const extractValueFromXml = (xml: string, tagName: string): string | null => {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
};

// Function to check if the XML contains a fault
const hasFault = (xml: string): boolean => {
  return xml.includes('<faultstring>') || xml.includes('<faultcode>');
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
        headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
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
      console.log("VIES response received, length:", xmlText.length);
      
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
      
      // Extract data using our simple XML parser
      const isValid = extractValueFromXml(xmlText, 'valid') === 'true';
      const companyName = extractValueFromXml(xmlText, 'name') || "";
      const address = extractValueFromXml(xmlText, 'address') || "";
      
      console.log(`Validation result: valid=${isValid}, name=${companyName}, address=${address}`);
      
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
      console.error("Fetch error:", fetchError.message || fetchError);
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
    return new Response(JSON.stringify({ 
      valid: false,
      error: `Service error: ${error.message || "Unknown error"}`
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
