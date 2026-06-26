import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import { resolveClientLanguage } from "../_shared/clientLanguage.ts";
import { acceptanceSubject, buildAcceptanceHtml, buildAcceptanceText } from "../_shared/leasingEmails.ts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  offerId: string;
  customContent?: string;
  includePdfAttachment?: boolean;
  language?: string; // surcharge éventuelle ; sinon langue du client
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin', 'broker'],
      rateLimit: {
        endpoint: 'send-leasing-acceptance-email',
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: 'send-leasing-acceptance-email',
      },
    });

    if (!access.ok) {
      return access.response;
    }

    const { offerId, customContent, includePdfAttachment = true, language }: EmailRequest = await req.json();
    if (!offerId) {
      return new Response(
        JSON.stringify({ error: 'offerId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('[LEASING-ACCEPTANCE] Custom content provided:', !!customContent);
    console.log('[LEASING-ACCEPTANCE] Include PDF attachment:', includePdfAttachment);
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    console.log('[LEASING-ACCEPTANCE] Processing acceptance email for offer:', offerId);

    // Initialize Supabase client
    const supabase = access.context.supabaseAdmin;

    // Fetch offer details with equipment
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        clients (
          name,
          email,
          first_name,
          contact_name
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('[LEASING-ACCEPTANCE] Offer not found:', offerError);
      throw new Error('Offer not found');
    }

    if (
      !access.context.isServiceRole &&
      access.context.role !== 'super_admin' &&
      access.context.companyId !== offer.company_id
    ) {
      return new Response(
        JSON.stringify({ error: 'Cross-company leasing acceptance email is forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[LEASING-ACCEPTANCE] Offer company_id:', offer.company_id);

    // Langue de communication : surcharge éventuelle, sinon préférence du client.
    const lang = await resolveClientLanguage(supabase, { override: language, clientId: offer.client_id, offerId });
    console.log('[LEASING-ACCEPTANCE] Resolved language:', lang);

    // Fetch equipment for this offer
    const { data: equipment, error: equipmentError } = await supabase
      .from('offer_equipment')
      .select('title, quantity')
      .eq('offer_id', offerId);

    if (equipmentError) {
      console.error('[LEASING-ACCEPTANCE] Error fetching equipment:', equipmentError);
    }

    // Build equipment list as bullet points
    let equipmentList = '';
    if (equipment && equipment.length > 0) {
      equipmentList = equipment.map(item => 
        `<li style="margin-bottom: 8px;">${item.quantity}x ${item.title}</li>`
      ).join('');
    } else {
      // Fallback to equipment_description if no equipment items
      equipmentList = `<li>${offer.equipment_description || 'Matériel informatique'}</li>`;
    }

    // Get client name and email
    const clientEmail = offer.clients?.email || offer.client_email;
    const clientFirstName = offer.clients?.first_name || offer.clients?.contact_name || offer.client_name?.split(' ')[0] || 'Client';

    if (!clientEmail) {
      throw new Error('Client email not found');
    }

    console.log('[LEASING-ACCEPTANCE] Sending acceptance email to:', clientEmail);

    // Fetch PDF as base64 for attachment using Supabase Storage
    // Multi-tenant path with robust fallback strategy
    const bucket = Deno.env.get('LEASING_PDF_BUCKET') || 'platform-assets';

    const defaultFilename = Deno.env.get('LEASING_PDF_FILENAME') || 'modalites_leasing_itakecare.pdf';
    const rawEnvPath = (Deno.env.get('LEASING_PDF_PATH') || '').trim();
    const templatedEnvPath = rawEnvPath
      ? rawEnvPath
          .replace('{companyId}', offer.company_id)
          .replace('{company_id}', offer.company_id)
      : '';

    // Try company-scoped first, then env override (templated), then legacy flat path
    const candidatePaths = Array.from(
      new Set(
        [
          `company-${offer.company_id}/documents/${defaultFilename}`,
          templatedEnvPath,
          `documents/${defaultFilename}`,
        ].filter((p) => p && p.length > 0)
      )
    );

    let pdfAttachment = null as any;

    // Helper to base64 encode bytes safely in chunks
    const bytesToBase64 = (bytes: Uint8Array): string => {
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    };

    console.log('[LEASING-ACCEPTANCE] Using storage configuration:', { bucket, candidatePaths });
    console.log('[LEASING-ACCEPTANCE] Attempting to download PDF from storage (with fallbacks)...');

    for (const pdfPath of candidatePaths) {
      try {
        const { data: pdfFile, error: pdfDownloadError } = await supabase
          .storage
          .from(bucket)
          .download(pdfPath);

        if (pdfDownloadError) {
          console.warn('[LEASING-ACCEPTANCE] Storage download failed for path:', pdfPath, '-', pdfDownloadError.message || pdfDownloadError);
          continue; // Try next candidate
        }

        if (pdfFile) {
          const pdfBuffer = await pdfFile.arrayBuffer();
          console.log('[LEASING-ACCEPTANCE] ✅ PDF downloaded successfully from', pdfPath, '- size (bytes):', pdfBuffer.byteLength);

          const base64Pdf = bytesToBase64(new Uint8Array(pdfBuffer));
          pdfAttachment = {
            filename: defaultFilename,
            content: base64Pdf,
            contentType: 'application/pdf',
          } as any;
          console.log('[LEASING-ACCEPTANCE] ✅ PDF attachment prepared successfully from path:', pdfPath);
          break; // Stop on first success
        }
      } catch (pdfError) {
        console.error('[LEASING-ACCEPTANCE] ❌ Exception during PDF download for path:', pdfPath, '-', pdfError);
        // Try next candidate
      }
    }

    // Fallback: list storage folder to discover the PDF if direct paths failed
    if (!pdfAttachment) {
      try {
        const folder = `company-${offer.company_id}/documents`;
        console.log('[LEASING-ACCEPTANCE] Fallback listing folder:', folder);
        const { data: entries, error: listError } = await supabase
          .storage
          .from(bucket)
          .list(folder, { search: 'modalites', limit: 100 });

        if (listError) {
          console.warn('[LEASING-ACCEPTANCE] Storage list failed:', listError.message || listError);
        } else if (entries && entries.length) {
          const candidate = entries.find((e: any) => e.name?.toLowerCase().endsWith('.pdf')) || entries[0];
          if (candidate?.name) {
            const guessedPath = `${folder}/${candidate.name}`;
            console.log('[LEASING-ACCEPTANCE] Trying fallback file:', guessedPath);
            const { data: pdfFile2, error: pdfErr2 } = await supabase
              .storage
              .from(bucket)
              .download(guessedPath);
            if (!pdfErr2 && pdfFile2) {
              const buf2 = await pdfFile2.arrayBuffer();
              const base64Pdf2 = bytesToBase64(new Uint8Array(buf2));
              pdfAttachment = {
                filename: candidate.name,
                content: base64Pdf2,
                contentType: 'application/pdf',
              } as any;
              console.log('[LEASING-ACCEPTANCE] ✅ PDF attachment prepared via fallback from path:', guessedPath);
            }
          }
        }
      } catch (fallbackErr) {
        console.error('[LEASING-ACCEPTANCE] ❌ Exception during storage fallback listing:', fallbackErr);
      }
    }

    if (!pdfAttachment) {
      console.warn('[LEASING-ACCEPTANCE] ⚠️ No PDF found after trying paths:', candidatePaths);
      console.warn('[LEASING-ACCEPTANCE] 📋 Ensure the file exists in one of these paths in bucket:', bucket);
    }

    // HTML email template - Use custom content if provided, otherwise localized default
    const htmlContent = customContent || buildAcceptanceHtml(lang, clientFirstName, equipmentList);

    // Plain text version (localized)
    const equipmentTextList = equipment?.map(item => `• ${item.quantity}x ${item.title}`).join('\n')
      || `• ${offer.equipment_description || 'Matériel informatique'}`;
    const textContent = buildAcceptanceText(lang, clientFirstName, equipmentTextList);

    // Send email via Resend
    const emailPayload: any = {
      from: 'iTakecare <noreply@itakecare.be>',
      to: [clientEmail],
      subject: acceptanceSubject(lang),
      html: htmlContent,
      text: textContent,
    };

    // Add attachment only if requested and available
    console.log('[LEASING-ACCEPTANCE] PDF attachment available:', !!pdfAttachment);
    console.log('[LEASING-ACCEPTANCE] Include PDF attachment requested:', includePdfAttachment);
    
    if (includePdfAttachment && pdfAttachment) {
      emailPayload.attachments = [pdfAttachment];
      console.log('[LEASING-ACCEPTANCE] PDF attachment added to email payload');
      console.log('[LEASING-ACCEPTANCE] Attachment filename:', pdfAttachment.filename);
      console.log('[LEASING-ACCEPTANCE] Attachment content length:', pdfAttachment.content?.length || 0);
    } else {
      if (!includePdfAttachment) {
        console.log('[LEASING-ACCEPTANCE] PDF attachment excluded by request');
      } else {
        console.warn('[LEASING-ACCEPTANCE] No PDF attachment - email will be sent without it');
      }
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('[LEASING-ACCEPTANCE] Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log('[LEASING-ACCEPTANCE] Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[LEASING-ACCEPTANCE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
