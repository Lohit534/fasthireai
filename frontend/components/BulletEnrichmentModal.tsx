import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

export interface WeakBullet {
  id: string;
  originalBullet: string;
  question: string;
}

interface BulletEnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bullets: WeakBullet[];
  onSubmit: (answers: Record<string, string>) => void;
}

export default function BulletEnrichmentModal({ isOpen, onClose, bullets, onSubmit }: BulletEnrichmentModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Add small artificial delay so user feels it's processing their answers
    setTimeout(() => {
      onSubmit(answers);
      setIsSubmitting(false);
    }, 600);
  };

  if (!isOpen || bullets.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white border-slate-200 shadow-2xl p-0 overflow-hidden">
        
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-[#0d6e5a] to-[#094d3f] p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-32 h-32 text-white transform rotate-12" />
          </div>
          <DialogHeader className="relative z-10 text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white/20 p-1.5 rounded-lg border border-white/10">
                <Sparkles className="w-5 h-5 text-teal-100" />
              </div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">AI Pre-Check: Missing Metrics</DialogTitle>
            </div>
            <DialogDescription className="text-teal-100/90 text-sm font-medium">
              We analyzed your experience section. Filling in these specific numbers will dramatically boost your ATS score.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 max-h-[60vh] overflow-y-auto space-y-6">
          {bullets.map((b, idx) => (
            <div key={b.id} className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-50 border border-teal-200 text-[#0d6e5a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{b.question}</p>
                  <div className="pl-3 border-l-2 border-teal-400 py-1">
                    <p className="text-xs font-medium text-slate-500 italic">"{b.originalBullet}"</p>
                  </div>
                </div>
              </div>
              <div className="pl-9">
                <Input 
                  value={answers[b.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [b.id]: e.target.value }))}
                  placeholder="e.g. 25% increase, 10,000 users, etc."
                  className="bg-white border-slate-300 h-10 text-sm shadow-sm focus-visible:ring-[#0d6e5a]"
                />
              </div>
            </div>
          ))}
        </form>

        <DialogFooter className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 sm:justify-between items-center">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 font-semibold"
          >
            Skip this step
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#0d6e5a] hover:bg-[#094d3f] text-white shadow-md font-bold transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <span className="flex items-center">
                Optimize with Metrics <ArrowRight className="w-4 h-4 ml-1.5" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
