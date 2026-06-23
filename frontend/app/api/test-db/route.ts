import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateUUID } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient() as any;
    
    // Attempt inserting a test user
    const testUserId = "test-diag-user-id-" + Date.now();
    const userResult = await admin
      .from("User")
      .insert({
        id: testUserId,
        email: `test-diag-${Date.now()}@example.com`,
        name: "Diagnostic Test User",
        createdAt: new Date().toISOString()
      });
      
    // Attempt inserting a resume
    const resumeId = generateUUID();
    const resumeResult = await admin
      .from("Resume")
      .insert({
        id: resumeId,
        userId: testUserId,
        originalText: "Diag original text",
        optimizedText: "Diag optimized text",
        jobDescription: "Diag job description",
        jobTitle: "Diag Resume",
        company: "Diag Company",
        scoreBefore: 10,
        scoreAfter: 20,
        keywordsBefore: 1,
        keywordsAfter: 2,
        impactBefore: 3,
        impactAfter: 4,
        keywordsAdded: ["test", "diag"],
        createdAt: new Date().toISOString()
      });

    // Cleanup
    await admin.from("Resume").delete().eq("id", resumeId);
    await admin.from("User").delete().eq("id", testUserId);

    return NextResponse.json({
      userResult: {
        error: userResult.error,
        status: userResult.status,
        statusText: userResult.statusText
      },
      resumeResult: {
        error: resumeResult.error,
        status: resumeResult.status,
        statusText: resumeResult.statusText
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
