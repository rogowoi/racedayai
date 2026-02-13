import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { generateRaceDayPdf } from '@/lib/pdf-generator';
import { isPaidPlan } from '@/lib/stripe';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session
    const session = await auth();

    // Check if user is authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Load the plan with includes
    const plan = await prisma.racePlan.findUnique({
      where: { id },
      include: {
        course: true,
        athlete: true,
      },
    });

    // Check if plan exists
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Verify user owns this plan
    if (plan.athleteId !== session.user.id) {
      const athlete = await prisma.athlete.findUnique({
        where: { id: plan.athleteId },
      });

      if (!athlete || athlete.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Check if user's plan allows PDF export (Season+ only)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || !isPaidPlan(user.plan)) {
      return NextResponse.json(
        { error: 'PDF export requires a Season Pass or Pro subscription.' },
        { status: 403 }
      );
    }

    // Generate the PDF
    const pdfBuffer = await generateRaceDayPdf(plan as any);

    // Return the PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${plan.course.raceName.replace(/\s+/g, '_')}_RacePlan.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
