"""
FastHire-AI Python AI Microservice
Layer 1: Sentence-BERT (all-MiniLM-L6-v2) — semantic ATS scoring
Layer 2: spaCy (en_core_web_sm) — NER skill/title extraction
Layer 3: Gemini 1.5 Flash — AI resume rewriting
Host FREE on HuggingFace Spaces (Docker)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import spacy
import google.generativeai as genai
import os
import re
import json
from typing import List, Set, Dict, Any

app = FastAPI(title="FastHire-AI", version="1.0.0")

# Enable CORS for public queries
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load NLP models at startup
sbert = SentenceTransformer("all-MiniLM-L6-v2")
nlp = spacy.load("en_core_web_sm")

# Configure Gemini model connection
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_KEY)
gemini = genai.GenerativeModel("gemini-1.5-flash")

ACTION_VERBS = {
    "achieved", "accelerated", "architected", "automated", "built", "coached", "created", "cut",
    "delivered", "deployed", "designed", "developed", "drove", "engineered", "established",
    "executed", "generated", "grew", "implemented", "improved", "increased", "launched", "led",
    "managed", "mentored", "migrated", "optimized", "reduced", "refactored", "scaled", "shipped",
    "spearheaded", "streamlined", "transformed"
}

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "arent", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt",
    "doing", "dont", "down", "during", "each", "few", "for", "from", "further", "had", "hadnt",
    "has", "hasnt", "have", "havent", "having", "he", "hed", "hell", "hes", "her", "here",
    "heres", "hers", "herself", "him", "himself", "his", "how", "howes", "i", "id", "ill",
    "im", "ive", "if", "in", "into", "is", "isnt", "it", "its", "itself", "lets", "me",
    "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such",
    "than", "that", "thats", "the", "their", "theirs", "them", "themselves", "then", "there",
    "theres", "these", "they", "theyd", "theyll", "theyre", "theyve", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasnt", "we", "wed",
    "well", "were", "werent", "what", "whats", "when", "whens", "where", "wheres", "which",
    "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would", "wouldnt", "you",
    "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
}

class ScoreRequest(BaseModel):
    resume_text: str
    job_description: str

class OptimizeRequest(BaseModel):
    resume_text: str
    job_description: str
    rewrite: bool = True

class ExtractSkillsRequest(BaseModel):
    resume_text: str

# ----------------- Helper NLP Functions -----------------

def semantic_score(resume_text: str, job_description: str) -> int:
    """Layer 1: Calculate Sentence-BERT Cosine Similarity"""
    if not resume_text.strip() or not job_description.strip():
        return 0
    try:
        emb1 = sbert.encode(resume_text, convert_to_tensor=True)
        emb2 = sbert.encode(job_description, convert_to_tensor=True)
        cosine_score = util.cos_sim(emb1, emb2)
        score = float(cosine_score[0][0]) * 100
        # Bound score between 0 and 100
        return max(0, min(100, round(score)))
    except Exception:
        return 0

def extract_keywords(text: str) -> Set[str]:
    """Clean text, remove punctuation and split into single-words & bigrams"""
    if not text:
        return set()
    
    cleaned = re.sub(r'[^a-zA-Z0-9\s+#]', ' ', text.lower())
    words = [w.strip() for w in cleaned.split() if w.strip()]
    
    keywords = set()
    # Single words
    for w in words:
        if w not in STOP_WORDS and len(w) > 2:
            keywords.add(w)
            
    # Bigrams (adjacent word combinations)
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i+1]
        if w1 not in STOP_WORDS and w2 not in STOP_WORDS:
            keywords.add(f"{w1} {w2}")
            
    return keywords

def keyword_match_score(resume_keywords: Set[str], jd_keywords: Set[str]) -> Dict[str, Any]:
    """Calculate overlap of JD keywords in resume keywords"""
    if not jd_keywords:
        return {"score": 100, "found": [], "missing": []}
        
    found = []
    missing = []
    
    # Check lowercase overlaps
    res_lower = {r.lower() for r in resume_keywords}
    for kw in jd_keywords:
        if kw.lower() in res_lower:
            found.append(kw)
        else:
            missing.append(kw)
            
    score = (len(found) / len(jd_keywords)) * 100
    return {
        "score": round(score),
        "found": found,
        "missing": missing
    }

def extract_entities(text: str) -> Dict[str, List[str]]:
    """Layer 2: spaCy NER Extraction for skill terms and roles"""
    doc = nlp(text)
    skills = set()
    titles = set()
    
    # Check standard tech terms list case-insensitively
    tech_keywords = [
        "python", "java", "typescript", "javascript", "react", "node", "sql", "aws", "gcp", "azure", 
        "docker", "kubernetes", "fastapi", "django", "postgresql", "mongodb", "redis", "graphql", 
        "rest", "git", "devops", "linux", "c++", "c#", "rust", "go", "angular", "vue"
    ]
    
    for tk in tech_keywords:
        pattern = r'\b' + re.escape(tk) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            skills.add(tk.capitalize() if tk not in ("c++", "c#") else tk.upper())

    # Map spaCy recognized entity tags
    for ent in doc.ents:
        val = ent.text.strip()
        if len(val) < 2 or len(val) > 40:
            continue
            
        if ent.label_ in ("ORG", "PRODUCT"):
            if val.lower() not in STOP_WORDS:
                skills.add(val)
        elif ent.label_ in ("PERSON"):
            if val.lower() not in STOP_WORDS:
                titles.add(val)

    return {
        "skills": list(skills),
        "titles": list(titles)
    }

def impact_score(resume_text: str) -> int:
    """Analyze bullet lines for strong action verbs and numbers/metrics"""
    lines = [l.strip() for l in resume_text.splitlines() if l.strip()]
    # Select lines starting with bullets
    bullets = [line for line in lines if re.match(r'^[•\-*\u2022]', line) or (len(line) > 20 and len(line) < 200)]
    
    if not bullets:
        return 30 # Default baseline
        
    bullet_scores = []
    for bullet in bullets:
        # Check action verbs
        words = re.findall(r'\b[a-zA-Z]+\b', bullet.lower())
        has_verb = any(w in ACTION_VERBS for w in words)
        # Check numerical quantification
        has_num = bool(re.search(r'\b\d+%?\b|\b(million|thousand|lakh|crore|k|m)\b', bullet, re.IGNORECASE))
        
        bullet_score = 0
        if has_verb:
            bullet_score += 50
        if has_num:
            bullet_score += 50
        bullet_scores.append(bullet_score)
        
    return round(sum(bullet_scores) / len(bullets))

def formatting_score(resume_text: str) -> int:
    """Inspect formatting structure and contact details"""
    score = 0
    lower = resume_text.lower()
    
    # Section Header checks
    if re.search(r'\b(experience|work history|employment)\b', lower):
        score += 20
    if re.search(r'\b(education|academic|college|university)\b', lower):
        score += 20
    if re.search(r'\b(skills|technologies|expertise)\b', lower):
        score += 20
        
    # Contact check
    if "@" in lower:
        score += 20
    if re.search(r'\b\d{10}\b|\+\d{2}', lower):
        score += 20
        
    return score

def full_score(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Aggregate ATS composite score profiles"""
    sem = semantic_score(resume_text, job_description)
    
    res_kw = extract_keywords(resume_text)
    jd_kw = extract_keywords(job_description)
    kw_data = keyword_match_score(res_kw, jd_kw)
    kw_score = kw_data["score"]
    
    imp = impact_score(resume_text)
    fmt = formatting_score(resume_text)
    
    # Weight: Semantic (35%), Keyword (25%), Impact (25%), Formatting (15%)
    overall = round((sem * 0.35) + (kw_score * 0.25) + (imp * 0.25) + (fmt * 0.15))
    ents = extract_entities(resume_text)
    
    return {
        "overall": overall,
        "semantic_match": sem,
        "keyword_match": kw_score,
        "impact_bullets": imp,
        "formatting": fmt,
        "extracted_skills": ents["skills"],
        "extracted_titles": ents["titles"],
        "missing_keywords": kw_data["missing"],
        "found_keywords": kw_data["found"]
    }

# ----------------- LLM Generative Prompts -----------------

def build_prompt(resume_text: str, job_description: str, missing_keywords: List[str], extracted_skills: List[str]) -> str:
    """Construct optimization instructions prompt"""
    truncated_jd = job_description[:2500]
    truncated_resume = resume_text[:3500]
    top_missing = missing_keywords[:15]
    
    return f"""You are a professional resume optimizer and ATS expert.
Your goal is to optimize the Candidate's Resume to better align with the Job Description.

### STRICT RULES & CONSTRAINTS:
1. **NO FABRICATION**: NEVER fabricate or make up companies, employment dates, degrees, certifications, job titles, or candidate achievements. Only work with the information provided.
2. **NATURAL KEYWORD INJECTION**: Inject the following missing keywords from the job description naturally into the experience, projects, or skills sections where they fit contextually:
   Keywords to inject: {", ".join(top_missing)}
3. **STRONG ACTION VERBS**: Rewrite weak or passive bullet points in the experience or project sections to start with strong action verbs (e.g., "automated", "refactored", "implemented", "scaled").
4. **NO ARTIFICIAL QUANTIFICATION**: Add quantification (numbers, percentages, metrics) ONLY where it is clearly implied by the context. Do not invent arbitrary numbers.
5. **PRESERVE STRUCTURE**: Keep all original sections (Experience, Projects, Education, etc.) intact. Maintain the candidate's name and contact information.
6. **BULLET SYMBOL**: Use the bullet character "•" (and only "•") for all bulleted list items. Do not use dashes or asterisks.
7. **OUTPUT FORMAT**: You must respond ONLY with a raw JSON object matching the schema below. Do not wrap the JSON output in markdown code block fences (e.g., do not use ```json or ```). Your output must be directly parseable.

### JSON SCHEMA:
{{
  "resume": "The entire optimized resume text as a single string, including sections, formatting, and newlines.",
  "keywordsAdded": ["Array", "of", "keywords", "from", "the", "missing", "list", "that", "you", "successfully", "integrated"],
  "changesCount": 5,
  "summary": "A concise explanation of the changes made and how they improve the resume's alignment."
}}

### INPUT DATA:
#### TARGET JOB DESCRIPTION (Truncated):
{truncated_jd}

#### CANDIDATE CURRENT RESUME (Truncated):
{truncated_resume}

#### CURRENT EXTRACTED SKILLS:
{", ".join(extracted_skills)}

Respond with the exact JSON object now."""

def call_gemini(prompt: str, raw_text: str) -> Dict[str, Any]:
    """Layer 3: Generates optimizations via Gemini 1.5 Flash"""
    if not GEMINI_KEY:
        return {
            "resume": raw_text,
            "keywordsAdded": [],
            "changesCount": 0,
            "summary": "Optimized (Gemini credentials missing)."
        }
        
    try:
        response = gemini.generate_content(prompt)
        text = response.text
        if not text:
            raise ValueError("Empty generation block.")
            
        # Strip markdown code fences if outputted
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r'^```(?:json)?\r?\n?', '', cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r'\r?\n?```$', '', cleaned, flags=re.IGNORECASE).strip()
            
        return json.loads(cleaned)
    except Exception:
        return {
            "resume": raw_text,
            "keywordsAdded": [],
            "changesCount": 0,
            "summary": "Optimized."
        }

# ----------------- REST API Route Handlers -----------------

@app.get("/health")
def healthcheck():
    """Health check endpoint checking SBERT state"""
    return {"status": "healthy"}

@app.post("/score")
def score_resume_endpoint(payload: ScoreRequest):
    """ATS Score calculator route"""
    try:
        return full_score(payload.resume_text, payload.job_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize")
def optimize_resume_endpoint(payload: OptimizeRequest):
    """Resume optimization and rewrite route"""
    try:
        # 1. Pre-scoring
        pre_scores = full_score(payload.resume_text, payload.job_description)
        
        # 2. Rewrite trigger
        if payload.rewrite:
            prompt = build_prompt(
                payload.resume_text, 
                payload.job_description, 
                pre_scores["missing_keywords"], 
                pre_scores["extracted_skills"]
            )
            opt_data = call_gemini(prompt, payload.resume_text)
        else:
            opt_data = {
                "resume": payload.resume_text,
                "keywordsAdded": [],
                "changesCount": 0,
                "summary": "Scoring calculated. No rewrite requested."
            }
            
        # 3. Post-scoring
        post_scores = full_score(opt_data["resume"], payload.job_description)
        
        return {
            "scoreBefore": pre_scores["overall"],
            "scoreAfter": post_scores["overall"],
            "optimizedText": opt_data["resume"],
            "keywordsAdded": opt_data["keywordsAdded"],
            "changesCount": opt_data["changesCount"],
            "summary": opt_data["summary"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract-skills")
def extract_skills_endpoint(payload: ExtractSkillsRequest):
    """Parsed skills extractor route"""
    try:
        ents = extract_entities(payload.resume_text)
        return {"skills": ents["skills"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
