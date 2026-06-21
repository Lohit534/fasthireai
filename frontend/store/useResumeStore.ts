import { create } from "zustand";
import { OptimizeResult, CreditInfo } from "../types";

interface ResumeState {
  resumeText: string;
  jobDescription: string;
  isOptimizing: boolean;
  result: OptimizeResult | null;
  credits: CreditInfo | null;
  setResumeText: (text: string) => void;
  setJobDescription: (text: string) => void;
  setOptimizing: (v: boolean) => void;
  setResult: (r: OptimizeResult | null) => void;
  setCredits: (c: CreditInfo | null) => void;
  reset: () => void;
}

const initialState = {
  resumeText: "",
  jobDescription: "",
  isOptimizing: false,
  result: null,
  credits: null,
};

export const useResumeStore = create<ResumeState>((set) => ({
  ...initialState,
  setResumeText: (text) => set({ resumeText: text }),
  setJobDescription: (text) => set({ jobDescription: text }),
  setOptimizing: (v) => set({ isOptimizing: v }),
  setResult: (r) => set({ result: r }),
  setCredits: (c) => set({ credits: c }),
  reset: () => set(initialState),
}));
