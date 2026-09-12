import { createMockAnalysis } from '@/lib/governance-analysis';

// Deliberately mocked for the buildathon, independent of API keys and environment flags.
export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    return Response.json(createMockAnalysis(input), { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : 'Enter valid proposal information.' }, { status: 400 });
  }
}
