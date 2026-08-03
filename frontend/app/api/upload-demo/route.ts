import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Standard supported video extensions
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"];

function ensureUploadsDirExists() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    ensureUploadsDirExists();
    const files = fs.readdirSync(UPLOADS_DIR);
    
    // Look for video files in public/uploads
    const videoFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return VIDEO_EXTENSIONS.includes(ext);
    });

    // Default preference to demo.mp4 if present, else first video file
    let defaultVideo = videoFiles.find((f) => f.toLowerCase().startsWith("demo.")) || videoFiles[0] || null;

    if (defaultVideo) {
      return NextResponse.json({
        exists: true,
        videoUrl: `/uploads/${defaultVideo}`,
        videoName: defaultVideo,
        allVideos: videoFiles.map((f) => ({
          name: f,
          url: `/uploads/${f}`,
        })),
      });
    }

    return NextResponse.json({
      exists: false,
      videoUrl: null,
      allVideos: [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to check uploads" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureUploadsDirExists();
    const formData = await request.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const filename = file.name || "demo.mp4";
    const ext = path.extname(filename).toLowerCase() || ".mp4";

    if (!VIDEO_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid video format. Please upload a video file (.mp4, .webm, .mov, etc.)" },
        { status: 400 }
      );
    }

    // Save with sanitized filename (e.g. demo.mp4 or original filename)
    const sanitizedName = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const targetFilename = sanitizedName.toLowerCase().startsWith("demo") ? sanitizedName : `demo_${sanitizedName}`;
    const filePath = path.join(UPLOADS_DIR, targetFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      videoUrl: `/uploads/${targetFilename}`,
      videoName: targetFilename,
      message: `Video uploaded successfully to public/uploads/${targetFilename}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to upload video" }, { status: 500 });
  }
}
