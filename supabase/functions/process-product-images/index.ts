
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  imageUrls: string[];
  productName: string;
  targetSize: { width: number; height: number };
  backgroundColor: string;
}

interface ProcessedImageResult {
  originalUrl: string;
  processedBlob: string; // base64 encoded
  filename: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imageUrls, 
      productName, 
      targetSize = { width: 600, height: 600 },
      backgroundColor = 'white'
    }: ProcessRequest = await req.json();
    
    if (!imageUrls || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'imageUrls parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎨 Processing ${imageUrls.length} images for ${productName}`);

    const processedImages: ProcessedImageResult[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      
      try {
        console.log(`Processing image ${i + 1}/${imageUrls.length}: ${imageUrl}`);
        
        // Download the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          console.error(`Failed to download image: ${imageUrl}`);
          continue;
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        console.log(`Downloaded image, size: ${imageBuffer.byteLength} bytes`);
        
        // Process the image (resize, remove background, add white background)
        const processedBuffer = await processImage(
          imageBuffer, 
          targetSize.width, 
          targetSize.height,
          backgroundColor
        );
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...new Uint8Array(processedBuffer)));
        
        processedImages.push({
          originalUrl: imageUrl,
          processedBlob: base64,
          filename: `${productName.replace(/[^a-zA-Z0-9]/g, '_')}_${i + 1}.webp`
        });
        
        console.log(`✅ Processed image ${i + 1} successfully`);
        
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        // Continue with other images
      }
    }

    console.log(`🎉 Successfully processed ${processedImages.length}/${imageUrls.length} images`);

    return new Response(
      JSON.stringify({ 
        processedImages,
        total: processedImages.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in process-product-images function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processImage(
  imageBuffer: ArrayBuffer, 
  targetWidth: number, 
  targetHeight: number,
  backgroundColor: string
): Promise<ArrayBuffer> {
  
  // For now, we'll implement a basic image processing
  // In a real implementation, you would use image processing libraries
  // or integrate with services like Cloudinary, ImageKit, etc.
  
  try {
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(imageBuffer);
    
    // For demonstration, we'll return the original image
    // In production, you would:
    // 1. Decode the image
    // 2. Resize to targetWidth x targetHeight
    // 3. Remove background using AI models
    // 4. Add white background
    // 5. Optimize and compress
    // 6. Convert to WebP format
    
    console.log(`Image processing simulated: ${targetWidth}x${targetHeight}, background: ${backgroundColor}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return imageBuffer; // Return original for now
    
  } catch (error) {
    console.error('Error in processImage:', error);
    throw error;
  }
}
