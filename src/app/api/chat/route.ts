import { createOpenAI } from '@ai-sdk/openai';
import { streamObject } from 'ai'; // Import streamObject
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Set max duration for Vercel functions, for streaming responses
export const maxDuration = 300; // 5 minutes (adjust as needed for long generations)

// --- OpenAI Client Initialization ---
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// ------------------------------------

// Zod Schema for Menu Item (assuming it remains consistent)
const MenuItemSchema = z.object({
  name: z.string(),
  price: z.number(),
});

// The CatererOutputSchema, updated to reflect the actual UUID string ID
// This schema describes the structure of *each caterer object the AI should generate*.
const CatererOutputSchema = z.object({
    id: z.string().uuid(), // IMPORTANT: Confirmed UUID string from Supabase
    name: z.string(),
    location: z.string(),
    cuisines: z.array(z.string()),
    menu: z.object({ items: z.array(MenuItemSchema) }),
    rating: z.number().nullable().optional(), // Make rating nullable and optional if it can be null or missing
    matchReason: z.string(), // This is the AI-generated reason for the match
});

// Your MatchSchema, which is the *overall object structure* for the AI's response.
// This is the schema you will pass to streamObject and useObject.
const MatchSchema = z.object({
    caterers: z.array(CatererOutputSchema),
});

// Supabase client initialization (also server-side)
const supabaseServer = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  console.log('--- /api/chat POST route hit (for useObject) ---');
  try {
    // const authorization = await (await headers()).get('authorization');
    // if (!authorization || !authorization.startsWith('Bearer ')) {
    //   console.warn('Authorization header missing or malformed.');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // const token = authorization.split('Bearer ')[1];

    // Important: In a real app, validate this token with Supabase auth.getUser(token)
    // For this example, we'll assume it's checked by a middleware or previous step
    // const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    // if (authError || !user) {
    //   console.error('Authentication error:', authError?.message || 'Invalid token');
    //   return NextResponse.json({ error: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
    // }
    // console.log('User authenticated:', user.id);

    // With useObject, the client sends the 'input' directly in the body.
    // The structure will typically be { input: "your prompt string" }
    let reqBody;
    try {
        const rawBody = await req.text();
        console.log('Raw request body received:', rawBody); // Debug: Check raw string
        reqBody = JSON.parse(rawBody);
        console.log('Parsed request body:', reqBody); // Debug: Check parsed object
    } catch (jsonError) {
        console.error('Error parsing JSON body:', jsonError);
        return NextResponse.json({ error: 'Invalid JSON body in request.' }, { status: 400 });
    }

    // The 'input' property from the client-side useObject submit function


    // Fetch caterers from Supabase (this part remains the same)
    const { data: caterers, error: supabaseError } = await supabaseServer.from('caterers').select('*');
    if (supabaseError) {
      console.error('Supabase error:', supabaseError.message);
      return NextResponse.json({ error: 'Failed to fetch caterers' }, { status: 500 });
    }

    // Call streamObject with your configured openai client and the MatchSchema
    const result = await streamObject({
      model: openai('gpt-4o-mini'),
      schema: MatchSchema, // This is the overall schema for the *output object*
      prompt: `You are an AI assistant for a catering company called Kai Catering.
      Current date: ${new Date().toLocaleDateString()}.
      Current time: ${new Date().toLocaleTimeString()}.
      Current location: Soweto, Gauteng, South Africa.

      You need to help users find suitable caterers based on their request.
      Here is a list of available caterers (JSON array): ${JSON.stringify(caterers)}

      Based on the user's message, filter and recommend only the caterers that closely match the user's requirements.
      For each recommended caterer, provide a brief 'matchReason' explaining why they are suitable.
      If no caterers match, return an empty array for 'caterers'.
      User message: `, // Use the userPrompt from reqBody.input
      temperature: 0.7,
    });

    // Return the streamed response
    return result.toTextStreamResponse(); // This sends the partial JSON objects as they are streamed

  } catch (error) {
    console.error('--- /api/chat POST route ERROR (for useObject) ---');
    console.error('Error details:', error);

    // If you still have the NoObjectGeneratedError, log it:
    // import { NoObjectGeneratedError } from 'ai';
    // if (NoObjectGeneratedError.isInstance(error)) {
    //     console.error("AI_NoObjectGeneratedError details:");
    //     console.error("  Cause:", error.cause);
    //     console.error("  Generated text:", error.text);
    //     return NextResponse.json({ error: 'AI failed to generate valid object', details: error.cause, rawOutput: error.text }, { status: 500 });
    // }

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON body in request.' }, { status: 400 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}