import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { AzureOpenAI } from 'openai';

interface ImageAnalysis {
  filename: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  analysis: string;
}

// Azure OpenAI configuration
const endpoint = "https://stefanoshub2178064662.openai.azure.com/";
const modelName = "makeathon"; // This should match your deployment name
const deployment = "makeathon";
const apiVersion = "2025-01-01-preview";

// You should set this in your environment variables
const apiKey = process.env.AZURE_OPENAI_API_KEY || "<your-api-key>";

const client = new AzureOpenAI({
  endpoint,
  apiKey,
  apiVersion
});

// Analyze image using Azure OpenAI Vision
async function analyzeImageWithAI(base64Image: string, filename: string, metadata: sharp.Metadata): Promise<string> {
  try {
    // Check if API key is configured
    if (!apiKey || apiKey === "<your-api-key>") {
      console.warn('Azure OpenAI API key not configured, falling back to basic analysis');
      return analyzeImageContentBasic(metadata, filename);
    }    const response = await client.chat.completions.create({
      model: deployment, // Use deployment name as model
      messages: [
        {
          role: "system",
          content: `Είσαι ένας εξειδικευμένος αναλυτής εικόνων για ασφαλιστική εταιρεία. Αναλύεις εικόνες που στέλνουν πελάτες για να τεκμηριώσουν περιστατικά ασφάλισης.

Παρακαλώ αναλύστε την εικόνα και δώστε:
1. Περιγραφή του τι βλέπετε (οχήματα, ζημιές, περιβάλλον, κλπ)
2. Τυχόν ζημιές που παρατηρείτε
3. Σημαντικές λεπτομέρειες για την ασφαλιστική υπόθεση
4. Συστάσεις για επιπλέον τεκμηρίωση αν χρειάζεται

Απαντήστε στα ελληνικά με σαφή και επαγγελματικό τρόπο.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Αναλύστε αυτή την εικόνα που στάλθηκε για ασφαλιστικό περιστατικό. Όνομα αρχείου: ${filename}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 1
    });

    const analysis = response.choices[0]?.message?.content;
    
    if (!analysis) {
      throw new Error('No analysis content returned from Azure OpenAI');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing image with Azure OpenAI:', error);
    // Fallback to basic analysis
    return analyzeImageContentBasic(metadata, filename);
  }
}

// Fallback basic analysis function
function analyzeImageContentBasic(metadata: sharp.Metadata, filename: string): string {
  const { width = 0, height = 0, format, hasAlpha } = metadata;
  
  let analysis = "Βασική ανάλυση εικόνας: ";
  
  if (width > 1920 && height > 1080) {
    analysis += "Εικόνα υψηλής ανάλυσης, ";
  } else if (width < 800 && height < 600) {
    analysis += "Εικόνα χαμηλής ανάλυσης, ";
  } else {
    analysis += "Εικόνα μεσαίας ανάλυσης, ";
  }
  
  const aspectRatio = width / height;
  if (aspectRatio > 1.5) {
    analysis += "panoramic ή landscape format. ";
  } else if (aspectRatio < 0.8) {
    analysis += "portrait format. ";
  } else {
    analysis += "τετραγωνικό ή κανονικό format. ";
  }
  
  analysis += `Format: ${format?.toUpperCase()}, Διαστάσεις: ${width}x${height}px`;
  
  if (hasAlpha) {
    analysis += ", περιέχει διαφάνεια";
  }
  
  analysis += ". Η αυτόματη ανάλυση περιεχομένου δεν είναι διαθέσιμη. Παρακαλώ περιγράψτε τι βλέπουμε στην εικόνα.";
  
  return analysis;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }
    
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Analyze image with Sharp
    const metadata = await sharp(buffer).metadata();
    
    // Create base64 for AI analysis
    const base64 = buffer.toString('base64');
    
    // Generate AI analysis
    const analysis = await analyzeImageWithAI(base64, file.name, metadata);
    
    // Create a data URL for the image
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    const result: ImageAnalysis = {
      filename: file.name,
      size: file.size,
      dimensions: {
        width: metadata.width || 0,
        height: metadata.height || 0,
      },
      format: metadata.format || 'unknown',
      analysis,
    };
    
    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      analysis: result
    });
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
