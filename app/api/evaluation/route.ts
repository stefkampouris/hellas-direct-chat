import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      caseId,
      rating,
      satisfied,
      feedback,
      improvements,
      timestamp
    } = body;

    // Validate required fields
    if (!sessionId || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid evaluation data' },
        { status: 400 }
      );
    }

    // Store evaluation in database
    const evaluation = await DatabaseService.createEvaluation({
      session_id: sessionId,
      case_id: caseId || null,
      rating,
      satisfied,
      feedback: feedback || null,
      improvements: improvements || [],
      created_at: timestamp || new Date().toISOString()
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: 'Failed to save evaluation' },
        { status: 500 }
      );
    }

    // Optionally update the incident with evaluation reference
    if (caseId) {
      try {
        await DatabaseService.updateIncident(caseId, {
          evaluation_completed: true,
          evaluation_rating: rating
        });
      } catch (error) {
        console.warn('Failed to update incident with evaluation info:', error);
        // Don't fail the request if incident update fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      evaluationId: evaluation.id 
    });

  } catch (error) {
    console.error('Error handling evaluation submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
