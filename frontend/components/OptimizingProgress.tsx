import React, { useEffect, useState } from 'react';
import { OptimizeResult } from '@/types'; // Assuming this exists or similar

const STEPS = [
  { id: 1, label: 'Reading your resume' },
  { id: 2, label: 'Parsing the job description' },
  { id: 3, label: 'Finding your strongest stories' },
  { id: 4, label: 'Rewriting your experience section' },
  { id: 5, label: 'Aligning to ATS keywords' },
  { id: 6, label: 'Polishing the output' },
];

const FUN_FACTS = [
  'Recruiters spend about 7 seconds on the first pass of a resume',
  'Over 75% of resumes are rejected by ATS before a human reads them',
  'Resumes with metrics are 40% more likely to get callbacks',
  'Keywords from the job description boost ATS score by up to 60%',
  'Single-column resumes parse 3x better in ATS systems',
];

interface OptimizingProgressProps {
  onComplete: (result: any) => void;
  resumeText: string;
  jobDescription: string;
}

export default function OptimizingProgress({ onComplete, resumeText, jobDescription }: OptimizingProgressProps) {
  const [steps, setSteps] = useState<{ id: number; status: 'pending' | 'running' | 'done'; duration?: string }[]>(
    STEPS.map(s => ({ id: s.id, status: 'pending' }))
  );
  const [progress, setProgress] = useState(0);
  const [funFact, setFunFact] = useState(FUN_FACTS[0]);

  useEffect(() => {
    let factIndex = 0;
    const interval = setInterval(() => {
      factIndex = (factIndex + 1) % FUN_FACTS.length;
      setFunFact(FUN_FACTS[factIndex]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const stepStartTimes: Record<number, number> = {};
    let isMounted = true;

    const runOptimization = async () => {
      try {
        const res = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jobDescription }),
        });

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!isMounted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                console.error("Optimization failed:", data.error);
                break;
              }

              if (data.status === 'running') {
                stepStartTimes[data.step] = Date.now();
                setSteps(prev =>
                  prev.map(s => (s.id === data.step ? { ...s, status: 'running' } : s))
                );
                setProgress(Math.round(((data.step - 1) / 6) * 100));
              }

              if (data.status === 'done') {
                const duration = ((Date.now() - (stepStartTimes[data.step] || Date.now())) / 1000).toFixed(1) + 's';

                setSteps(prev =>
                  prev.map(s => (s.id === data.step ? { ...s, status: 'done', duration } : s))
                );
                setProgress(Math.round((data.step / 6) * 100));

                if (data.result) {
                  setTimeout(() => {
                    if (isMounted) onComplete(data.result);
                  }, 800);
                }
              }
            } catch (e) {
              // Ignore incomplete chunks that failed to parse
            }
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    runOptimization();

    return () => {
      isMounted = false;
    };
  }, [resumeText, jobDescription, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Circular progress ring */}
      <div className="relative w-32 h-32 mb-8">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          {/* Background ring */}
          <circle cx="60" cy="60" r="54" fill="none" stroke="#E8E6F5" strokeWidth="8" />
          {/* Progress ring */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#6366F1"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{progress}%</span>
          <span className="text-xs text-gray-500">~{Math.round((100 - progress) / 5)}s left</span>
        </div>
      </div>

      {/* Current step title */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {STEPS.find(s => steps.find(st => st.id === s.id && st.status === 'running'))?.label ?? 'Almost ready'}
      </h2>
      <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">
        Stay on this tab — we'll ask you a couple of things if we need them.
      </p>

      {/* Steps list */}
      <div className="w-full max-w-lg space-y-2">
        {STEPS.map(step => {
          const s = steps.find(x => x.id === step.id);
          const status = s?.status ?? 'pending';

          return (
            <div
              key={step.id}
              className={`
                flex items-center justify-between
                px-5 py-3.5 rounded-xl
                transition-all duration-300
                ${
                  status === 'done'
                    ? 'bg-green-50 opacity-70'
                    : status === 'running'
                    ? 'bg-indigo-50 border border-indigo-100'
                    : 'bg-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                {status === 'done' ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : status === 'running' ? (
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex-shrink-0" />
                )}

                {/* Label */}
                <span
                  className={`text-sm font-medium
                  ${
                    status === 'done'
                      ? 'text-gray-500'
                      : status === 'running'
                      ? 'text-indigo-700 font-semibold'
                      : 'text-gray-400'
                  }
                `}
                >
                  {step.label}
                </span>
              </div>

              {/* Right side */}
              {status === 'done' && s?.duration && <span className="text-xs text-gray-400">{s.duration}</span>}
              {status === 'running' && <span className="text-xs text-indigo-500 font-medium">running</span>}
            </div>
          );
        })}
      </div>

      {/* Fun fact at bottom */}
      <p className="mt-8 text-xs text-gray-400 text-center max-w-sm transition-opacity duration-500">
        Did you know: {funFact}
      </p>
    </div>
  );
}
