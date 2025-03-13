
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle WooCommerce API calls
async function callWooCommerceAPI(url: string, endpoint: string, consumerKey: string, consumerSecret: string, queryParams: Record<string, string> = {}) {
  try {
    // Format the base URL
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const apiUrl = `${baseUrl}/wp-json/wc/v3/${endpoint}`;
    
    // Add authorization
    const headers = new Headers();
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    headers.append("Authorization", `Basic ${credentials}`);
    
    // Add query parameters
    const params = new URLSearchParams(queryParams);
    const requestUrl = `${apiUrl}?${params.toString()}`;
    
    console.log(`Calling WooCommerce API: ${requestUrl}`);
    
    // Make the request
    const response = await fetch(requestUrl, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      console.error(`Error from WooCommerce API: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response body:", responseText);
      return { error: `API error: ${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    console.error("Error calling WooCommerce API:", error);
    return { error: error.message || "Unknown error" };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    const requestData = await req.json();
    const { action, url, consumerKey, consumerSecret, page, perPage } = requestData;
    
    console.log(`Processing ${action} request`);
    
    // Validate required parameters
    if (!url || !consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let result;
    
    // Handle different actions
    switch (action) {
      case "testConnection":
        console.log("Testing connection to:", url);
        try {
          // Format the URL correctly
          const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          const apiUrl = `${baseUrl}/wp-json/wc/v3/products?per_page=1`;
          
          // Add Basic authentication
          const credentials = btoa(`${consumerKey}:${consumerSecret}`);
          const headers = new Headers();
          headers.append("Authorization", `Basic ${credentials}`);
          
          // Make the request
          console.log(`Making request to: ${apiUrl}`);
          const response = await fetch(apiUrl, {
            method: "GET",
            headers,
          });
          
          if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            const responseText = await response.text();
            console.error("Response body:", responseText);
            result = { 
              success: false,
              error: `API error: ${response.status} ${response.statusText}`
            };
          } else {
            const data = await response.json();
            console.log("Test connection successful, received data:", Array.isArray(data) ? `Array of ${data.length} items` : typeof data);
            result = { 
              success: true
            };
          }
        } catch (error) {
          console.error("Error testing connection:", error);
          result = { 
            success: false,
            error: error.message || "Unknown error"
          };
        }
        break;
        
      case "getProducts":
        // Fetch products with pagination
        try {
          const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          const apiUrl = `${baseUrl}/wp-json/wc/v3/products?page=${page || 1}&per_page=${perPage || 10}`;
          
          // Add Basic authentication
          const credentials = btoa(`${consumerKey}:${consumerSecret}`);
          const headers = new Headers();
          headers.append("Authorization", `Basic ${credentials}`);
          
          // Make the request
          console.log(`Making request to: ${apiUrl}`);
          const response = await fetch(apiUrl, {
            method: "GET",
            headers,
          });
          
          if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            const responseText = await response.text();
            console.error("Response body:", responseText);
            result = {
              products: [],
              error: `API error: ${response.status} ${response.statusText}`
            };
          } else {
            const products = await response.json();
            
            // Add credentials to products for later use
            const productsWithCredentials = products.map(product => ({
              ...product,
              siteUrl: url,
              consumerKey,
              consumerSecret
            }));
            
            console.log(`Retrieved ${products?.length || 0} products`);
            result = {
              products: productsWithCredentials || [],
            };
          }
        } catch (error) {
          console.error("Error fetching products:", error);
          result = {
            products: [],
            error: error.message || "Unknown error"
          };
        }
        break;
        
      case "getVariations":
        // Fetch variations for a specific product
        try {
          const { productId } = requestData;
          if (!productId) {
            return new Response(
              JSON.stringify({ error: "Missing productId parameter" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          const apiUrl = `${baseUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
          
          // Add Basic authentication
          const credentials = btoa(`${consumerKey}:${consumerSecret}`);
          const headers = new Headers();
          headers.append("Authorization", `Basic ${credentials}`);
          
          // Make the request
          console.log(`Making request to: ${apiUrl}`);
          const response = await fetch(apiUrl, {
            method: "GET",
            headers,
          });
          
          if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            const responseText = await response.text();
            console.error("Response body:", responseText);
            result = {
              variations: [],
              error: `API error: ${response.status} ${response.statusText}`
            };
          } else {
            const variations = await response.json();
            
            // Add credentials and parent ID to variations for later use
            const variationsWithCredentials = variations.map(variation => ({
              ...variation,
              siteUrl: url,
              consumerKey,
              consumerSecret,
              parent_id: productId
            }));
            
            console.log(`Retrieved ${variations?.length || 0} variations for product ${productId}`);
            result = {
              variations: variationsWithCredentials || [],
            };
          }
        } catch (error) {
          console.error("Error fetching variations:", error);
          result = {
            variations: [],
            error: error.message || "Unknown error"
          };
        }
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in WooCommerce import function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
