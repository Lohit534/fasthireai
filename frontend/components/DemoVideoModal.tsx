"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Play, 
  Upload, 
  Film, 
  FolderOpen, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  RefreshCw,
  Video
} from "lucide-react";
import { toast } from "react-hot-toast";

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [allVideos, setAllVideos] = useState<Array<{ name: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadTab, setShowUploadTab] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchVideoStatus = async () => {
    setLoading(true);
    setVideoError(false);
    try {
      const res = await fetch("/api/upload-demo");
      if (res.ok) {
        const data = await res.json();
        if (data.exists && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setVideoName(data.videoName);
          setAllVideos(data.allVideos || []);
        } else {
          setVideoUrl(null);
          setVideoName(null);
          setAllVideos([]);
        }
      }
    } catch (err) {
      console.error("Failed to load demo video state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVideoStatus();
      setShowUploadTab(false);
    }
  }, [isOpen]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|mov|m4v|mkv|avi)$/i)) {
      toast.error("Please select a valid video file (.mp4, .webm, .mov, etc.)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("/api/upload-demo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Demo video uploaded successfully!");
      setVideoUrl(data.videoUrl);
      setVideoName(data.videoName);
      setShowUploadTab(false);
      setVideoError(false);
      await fetchVideoStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-[#0e1017] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141722]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                FastHire AI Product Demo
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
                  Video Preview
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {videoUrl ? `Playing: ${videoName || "demo.mp4"}` : "Public Uploads Directory (/uploads)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadTab(!showUploadTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                showUploadTab 
                  ? "bg-violet-600 text-white shadow-lg" 
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{showUploadTab ? "Back to Player" : "Upload / Replace Video"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#090b10]">
          
          {loading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm font-medium">Checking public/uploads folder...</p>
            </div>
          ) : showUploadTab ? (
            /* Upload Tab UI */
            <div className="space-y-6 max-w-xl mx-auto py-4">
              <div className="text-center space-y-2">
                <h4 className="text-lg font-bold text-white">Upload Your Demo Video</h4>
                <p className="text-xs text-slate-400">
                  Upload a video file to save it to <code className="text-violet-300 bg-violet-950/60 px-1.5 py-0.5 rounded font-mono">public/uploads/demo.mp4</code> so visitors can watch it anytime.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-violet-500/40 hover:border-violet-400 bg-violet-950/10 hover:bg-violet-950/20 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/*,.mp4,.webm,.mov,.m4v,.mkv,.avi"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
                    <p className="text-sm font-semibold text-violet-200">Uploading demo video into public/uploads...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 group-hover:scale-110 transition-transform">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Click to select or drag & drop video file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports MP4, WebM, MOV, M4V (Saved directly to public/uploads/demo.mp4)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Information Note */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <FolderOpen className="h-4 w-4 text-violet-400" />
                  <span>Manual Directory Option:</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can also directly copy/paste your video file into your project folder at:
                  <br />
                  <code className="text-violet-300 font-mono text-[11px] block mt-1 bg-black/40 p-1.5 rounded border border-white/5 select-all">
                    frontend/public/uploads/demo.mp4
                  </code>
                </p>
              </div>

              {allVideos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Videos in public/uploads:</p>
                  <div className="space-y-1.5">
                    {allVideos.map((vid) => (
                      <div 
                        key={vid.name}
                        onClick={() => {
                          setVideoUrl(vid.url);
                          setVideoName(vid.name);
                          setShowUploadTab(false);
                          setVideoError(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          videoUrl === vid.url 
                            ? "bg-violet-600/20 border-violet-500 text-white font-bold" 
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Video className="h-3.5 w-3.5 text-violet-400" />
                          <span>{vid.name}</span>
                        </div>
                        {videoUrl === vid.url && (
                          <span className="text-[10px] text-violet-300 bg-violet-500/20 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : videoUrl && !videoError ? (
            /* Video Player UI */
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-video flex items-center justify-center group">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-contain max-h-[65vh]"
                />
              </div>

              <div className="flex items-center justify-between px-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Serving from <code className="text-slate-300 font-mono">public/uploads/{videoName}</code></span>
                </div>
                <button
                  onClick={() => setShowUploadTab(true)}
                  className="text-violet-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="h-3 w-3" /> Change Video
                </button>
              </div>
            </div>
          ) : (
            /* No Video Found / Placeholder Screen */
            <div className="py-12 px-4 text-center max-w-md mx-auto space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto shadow-inner">
                <Video className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xl font-extrabold text-white">No Demo Video Uploaded Yet</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can upload your demo video file here or save it to your project folder under <span className="text-violet-300 font-mono font-semibold">frontend/public/uploads/demo.mp4</span>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowUploadTab(true)}
                  className="w-full sm:w-auto btn-primary-gradient px-6 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Demo Video</span>
                </button>

                <button
                  onClick={fetchVideoStatus}
                  className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Check Uploads Folder</span>
                </button>
              </div>

              {/* Instructions Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs space-y-1 mt-4">
                <p className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Quick Instructions:
                </p>
                <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1 text-[11px]">
                  <li>Place your video file in <code className="text-violet-300 font-mono">public/uploads/demo.mp4</code></li>
                  <li>Click **Check Uploads Folder** or reopen this modal to play it!</li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
