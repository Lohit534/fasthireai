import { STOP_WORDS } from "./stopwords";

const TECH_TERMS = [
  "Python", "Java", "TypeScript", "React", "Node.js", "SQL", "AWS", "GCP", "Azure",
  "Docker", "Kubernetes", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Redis",
  "GraphQL", "REST", "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "Spark",
  "Kafka", "Git", "CI/CD", "Machine Learning", "Deep Learning", "NLP", "Agile",
  "Scrum", "DevOps", "Linux", "Bash", "Go", "Rust", "C++", "C#", "Swift", "Kotlin",
  "Flutter", "Vue", "Angular"
];

const TECH_MAP = new Map<string, string>(
  TECH_TERMS.map((t) => [t.toLowerCase(), t])
);

export function extractTechTerms(text: string): string[] {
  if (!text) return [];
  const results = new Set<string>();
  
  for (const term of TECH_TERMS) {
    // Escape regex characters (e.g., C++, Node.js)
    const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    // Match with boundary: if it starts/ends with alphanumeric, use word boundaries.
    // If it has trailing/leading symbols (like + or #), match with whitespace or punctuation boundary.
    const leadPattern = /^[a-zA-Z0-9]/.test(term) ? "\\b" : "(?:^|\\s|[,.;:!?()\"'])";
    const trailPattern = /[a-zA-Z0-9]$/.test(term) ? "\\b" : "(?:$|\\s|[,.;:!?()\"'])";
    
    const regex = new RegExp(`${leadPattern}${escaped}${trailPattern}`, "gi");
    if (regex.test(text)) {
      results.add(term);
    }
  }
  
  return Array.from(results);
}

export function extractActionVerbs(bulletText: string): string[] {
  if (!bulletText) return [];
  const verbs = [
    "achieved", "accelerated", "architected", "automated", "built", "coached", "created", "cut",
    "delivered", "deployed", "designed", "developed", "drove", "engineered", "established",
    "executed", "generated", "grew", "implemented", "improved", "increased", "launched", "led",
    "managed", "mentored", "migrated", "optimized", "reduced", "refactored", "scaled", "shipped",
    "spearheaded", "streamlined", "transformed"
  ];
  
  const lowerText = bulletText.toLowerCase();
  const matched = verbs.filter((verb) => {
    const regex = new RegExp(`\\b${verb}\\b`, "i");
    return regex.test(lowerText);
  });
  
  return matched;
}

export function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>();
  if (!text) return keywords;

  // Extract known tech terms first so they bypass standard stripping if needed
  const textTechTerms = extractTechTerms(text);
  for (const tech of textTechTerms) {
    keywords.add(tech);
  }

  // Convert to lowercase and replace characters except letters, numbers, spaces, +, #
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, " ");

  const words = cleaned
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean);

  // Extract single words
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if it is a canonical tech term
    if (TECH_MAP.has(word)) {
      keywords.add(TECH_MAP.get(word)!);
      continue;
    }
    
    // Standard filtering
    if (!STOP_WORDS.has(word) && word.length > 2) {
      keywords.add(word);
    }
  }

  // Extract bigrams (two-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    
    // Skip if either word is a stopword
    if (STOP_WORDS.has(word1) || STOP_WORDS.has(word2)) {
      continue;
    }
    
    const bigram = `${word1} ${word2}`;
    
    // Check if it is a canonical tech term
    if (TECH_MAP.has(bigram)) {
      keywords.add(TECH_MAP.get(bigram)!);
    } else {
      keywords.add(bigram);
    }
  }

  return keywords;
}
