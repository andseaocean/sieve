import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Downloads a resume PDF from Supabase Storage and returns it as base64.
 * Used to send PDFs directly to Claude API (no pdf-parse dependency).
 */
export async function downloadResumePDFAsBase64(
  supabase: SupabaseClient,
  resumeUrl: string
): Promise<string> {
  // Extract storage path from Supabase URL
  let storagePath: string | null = null;
  const patterns = [
    '/storage/v1/object/public/resumes/',
    '/storage/v1/object/sign/resumes/',
    '/storage/v1/object/resumes/',
  ];

  for (const prefix of patterns) {
    if (resumeUrl.includes(prefix)) {
      storagePath = resumeUrl.split(prefix)[1]?.split('?')[0] || null;
      break;
    }
  }

  let pdfBlob: Blob;

  if (storagePath) {
    // Download via Supabase SDK (works regardless of bucket visibility)
    const decodedPath = decodeURIComponent(storagePath);
    const { data, error } = await supabase.storage
      .from('resumes')
      .download(decodedPath);

    if (error || !data) {
      throw new Error(`Supabase storage download failed: ${error?.message || 'no data'}`);
    }

    pdfBlob = data;
  } else {
    // Fallback: direct fetch
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Direct PDF fetch failed: ${response.status} ${response.statusText}`);
    }

    pdfBlob = await response.blob();
  }

  // Convert Blob to base64
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}
