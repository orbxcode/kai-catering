import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct and supabase is initialized
import { NextResponse } from 'next/server';

const openai = createOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY!, // Reads from .env.local on the server
});

// Define the Zod schema for the expected output
const MatchSchema = z.object({
    caterers: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            location: z.string(),
            cuisines: z.array(z.string()),
            menu: z.object({ items: z.array(z.object({ name: z.string(), price: z.number() })) }),
            rating: z.number().optional(), // <--- ADD THIS LINE
            matchReason: z.string(),
        })
    ),
});

export async function POST(req: Request) {
  try {
    // 1. Validate incoming request body
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid request body: "messages" array is required and must not be empty.' }, { status: 400 });
    }

    const userPrompt = messages[messages.length - 1]?.content;
    if (typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        return NextResponse.json({ error: 'Invalid user prompt: Last message content is missing or empty.' }, { status: 400 });
    }

    // 2. Fetch caterers from Supabase
    const { data: caterers, error: supabaseError } = await supabase.from('caterers').select('*');

    if (supabaseError) {
      console.error('Supabase fetch error:', supabaseError.message);
      // Return a 500 status code for internal server errors
      return NextResponse.json({ error: `Failed to fetch caterers from database: ${supabaseError.message}` }, { status: 500 });
    }

    if (!caterers || caterers.length === 0) {
        console.warn('No caterers found in the database.');
        // Optionally, return an appropriate response if no caterers are available
        // This depends on whether empty caterers list is an error or a valid state
        return NextResponse.json({ caterers: [], message: 'No caterers available to match.' }, { status: 200 });
    }

    // 3. Generate matches with LLM using generateObject
    const { object: matchedCaterersObject, usage } = await generateObject({
      model: openai('gpt-4o-mini'), // Using gpt-4o-mini as in your original code
      schema: MatchSchema,
      prompt: `
        User request: "${userPrompt}"

        Available caterers (JSON array): ${JSON.stringify(caterers)}

        Instructions:
        Match the user’s catering needs (e.g., location, cuisine, budget, event size) with up to 3 of the provided caterers.
        For each match, you MUST provide all fields as defined in the schema (id, name, location, cuisines, menu including items and prices, and matchReason).
        Ensure the 'id' field for each matched caterer corresponds exactly to an 'id' from the 'Available caterers' list.
        Provide a concise, brief 'matchReason' explaining why they fit the request.
        Return a JSON object strictly adhering to the MatchSchema, containing the 'caterers' array with the top 3 (or fewer if less than 3 match well) selected caterers and their complete details.
        Do NOT include any additional text or formatting outside the JSON object.
      `,
    });

    // Log the usage if helpful for debugging or monitoring
    console.log('OpenAI API Usage:', usage);

    // 4. Return the generated object as a JSON response
    // Ensure the response object has the expected structure as per your schema.
    // NextResponse.json automatically sets Content-Type: application/json
    const response = NextResponse.json({
        role: 'assistant',
        content: JSON.stringify(matchedCaterersObject, null, 2)
    }, { status: 200 });

    console.log('API Response:', response);

    return response;

  } catch (error) {
    console.error('API Route Error:', error);

    // Differentiate between known errors and unexpected errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON body in request.' }, { status: 400 });
    }
    // You might want more specific error handling for 'ai' library errors or Zod validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        // If generateObject's internal validation somehow bubbles up, handle it.
         const zodError = error as z.ZodError;
         return NextResponse.json({ error: 'Invalid JSON body in request.', details: zodError.stack?.length ? zodError.stack : zodError.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to process request due to an unexpected error.' }, { status: 500 });
  }
}