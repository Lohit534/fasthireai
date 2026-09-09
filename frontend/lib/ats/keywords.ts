import { STOP_WORDS } from "./stopwords";

// ─── Single-token tech terms ──────────────────────────────────────────────────
const TECH_TERMS = [
  // Languages
  "Python", "Java", "JavaScript", "TypeScript", "Go", "Golang", "Rust", "Ruby",
  "Swift", "Kotlin", "Scala", "C", "C++", "C#", "PHP", "Perl", "Dart", "R",
  "MATLAB", "Bash", "Shell", "PowerShell", "Groovy", "Lua", "Elixir", "Haskell",
  "Julia", "Solidity",

  // Frontend
  "React", "Next.js", "Nextjs", "Vue", "Vue.js", "Angular", "Svelte", "Remix",
  "Nuxt", "Gatsby", "Redux", "Zustand", "MobX", "Tailwind", "TailwindCSS",
  "Bootstrap", "MaterialUI", "Styled-components", "Storybook", "Vite", "Webpack",
  "Babel", "ESLint", "Prettier", "Figma", "HTML", "CSS", "SCSS", "SASS",
  "WebSockets", "WebRTC", "PWA", "SPA", "SSR", "SSG",

  // Backend
  "Node.js", "Nodejs", "Express", "FastAPI", "Django", "Flask", "Spring",
  "Spring Boot", "NestJS", "Laravel", "Rails", "Gin", "Fiber", "gRPC",
  "REST", "RESTful", "GraphQL", "Apollo", "tRPC", "OpenAPI", "Swagger",
  "OAuth", "JWT", "WebSockets",

  // Databases
  "PostgreSQL", "MySQL", "SQLite", "MariaDB", "MongoDB", "Redis", "Cassandra",
  "DynamoDB", "Firestore", "Supabase", "PlanetScale", "CockroachDB", "Neo4j",
  "Elasticsearch", "OpenSearch", "Pinecone", "Weaviate", "Qdrant", "Chroma",
  "Snowflake", "BigQuery", "Redshift", "ClickHouse", "Druid", "SQL", "NoSQL",
  "ORM", "Prisma", "SQLAlchemy", "Sequelize", "TypeORM",

  // Cloud & Infrastructure
  "AWS", "GCP", "Azure", "Vercel", "Netlify", "Heroku", "DigitalOcean",
  "Cloudflare", "Lambda", "EC2", "S3", "RDS", "ECS", "EKS", "CloudFormation",
  "Terraform", "Pulumi", "CDK", "Ansible", "Chef", "Puppet",

  // DevOps & CI/CD
  "Docker", "Kubernetes", "Helm", "Istio", "Jenkins", "GitHub Actions",
  "GitLab CI", "CircleCI", "Travis CI", "ArgoCD", "FluxCD", "Prometheus",
  "Grafana", "Datadog", "New Relic", "Sentry", "PagerDuty", "Nginx", "HAProxy",
  "Vault", "Consul", "CI/CD", "DevOps", "SRE", "Linux", "Ubuntu",

  // AI / ML
  "TensorFlow", "PyTorch", "Keras", "scikit-learn", "XGBoost", "LightGBM",
  "CatBoost", "Hugging Face", "Transformers", "LangChain", "LlamaIndex",
  "OpenAI", "Anthropic", "Claude", "GPT", "LLM", "RAG", "RLHF",
  "Stable Diffusion", "Diffusion", "BERT", "T5", "LoRA", "QLoRA",
  "FAISS", "Pandas", "NumPy", "Matplotlib", "Seaborn", "Plotly",
  "Spark", "PySpark", "Dask", "Airflow", "MLflow", "DVC", "Weights & Biases",
  "SageMaker", "Vertex AI", "Databricks", "DataRobot", "H2O",
  "Computer Vision", "NLP", "OCR", "CNN", "RNN", "LSTM", "GAN",

  // Data
  "Kafka", "RabbitMQ", "Celery", "dbt", "Fivetran", "Stitch", "Airbyte",
  "Tableau", "Power BI", "Looker", "Metabase", "Superset", "Excel",

  // Mobile
  "Flutter", "React Native", "SwiftUI", "Jetpack Compose", "Expo",
  "Android", "iOS", "Xcode",

  // Testing
  "Jest", "Pytest", "Cypress", "Playwright", "Selenium", "Vitest",
  "JUnit", "Mocha", "Chai", "Supertest", "k6", "Locust",

  // Tools & Version Control
  "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Notion",
  "Postman", "Insomnia", "VS Code", "IntelliJ", "PyCharm",

  // Methodologies
  "Agile", "Scrum", "Kanban", "Waterfall", "TDD", "BDD", "DDD",
  "Microservices", "Serverless", "Event-driven",

  // Security
  "OWASP", "Penetration Testing", "SAST", "DAST", "SOC2", "ISO 27001",
  "Zero Trust", "RBAC", "ABAC",

  // Blockchain
  "Ethereum", "Web3.js", "Hardhat", "Truffle", "IPFS",
];

// ─── Phrase terms (bigrams / trigrams) ───────────────────────────────────────
// Matched as substrings so they survive tokenisation
const PHRASE_TERMS: string[] = [
  // AI/ML phrases
  "machine learning", "deep learning", "natural language processing",
  "large language model", "reinforcement learning", "transfer learning",
  "computer vision", "generative ai", "retrieval augmented generation",
  "neural network", "feature engineering", "data pipeline", "data engineering",
  "data science", "data analysis", "data visualization", "data modeling",
  "time series", "recommendation system", "anomaly detection",
  "model training", "model deployment", "model inference", "vector database",

  // Cloud phrases
  "cloud computing", "cloud infrastructure", "cloud native", "cloud migration",
  "infrastructure as code", "site reliability", "platform engineering",
  "continuous integration", "continuous deployment", "continuous delivery",
  "ci cd", "ci/cd pipeline",

  // Software engineering phrases
  "full stack", "full-stack", "frontend development", "backend development",
  "software development", "software engineering", "system design",
  "distributed systems", "high availability", "fault tolerant",
  "api development", "rest api", "microservices architecture",
  "event driven", "object oriented", "functional programming",
  "test driven development", "agile methodology", "code review",
  "performance optimization", "database design", "schema design",
  "version control",

  // Product phrases
  "product management", "product roadmap", "user experience",
  "a/b testing", "user research", "customer success",

  // Security phrases
  "security engineering", "information security", "network security",
  "application security", "penetration testing", "vulnerability assessment",
  "identity management",
];

const TECH_MAP = new Map<string, string>(
  TECH_TERMS.map((t) => [t.toLowerCase(), t])
);

export function extractTechTerms(text: string): string[] {
  if (!text) return [];
  const results = new Set<string>();

  for (const term of TECH_TERMS) {
    const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const leadPattern = /^[a-zA-Z0-9]/.test(term) ? "\\b" : `(?:^|\\s|[,.;:!?()"'])`;
    const trailPattern = /[a-zA-Z0-9]$/.test(term) ? "\\b" : `(?:$|\\s|[,.;:!?()"'])`;
    const regex = new RegExp(`${leadPattern}${escaped}${trailPattern}`, "gi");
    if (regex.test(text)) {
      results.add(term);
    }
  }

  // Also match multi-word phrase terms
  const lowerText = text.toLowerCase();
  for (const phrase of PHRASE_TERMS) {
    if (lowerText.includes(phrase)) {
      // Capitalise first letter for consistent display
      results.add(phrase.replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  return Array.from(results);
}

export function extractActionVerbs(bulletText: string): string[] {
  if (!bulletText) return [];
  const verbs = [
    "achieved", "accelerated", "architected", "automated", "built", "coached",
    "created", "cut", "delivered", "deployed", "designed", "developed", "drove",
    "engineered", "established", "executed", "generated", "grew", "implemented",
    "improved", "increased", "launched", "led", "managed", "mentored",
    "migrated", "optimized", "reduced", "refactored", "scaled", "shipped",
    "spearheaded", "streamlined", "transformed", "analyzed", "collaborated",
    "coordinated", "constructed", "containerized", "contributed", "debugged",
    "documented", "enhanced", "evaluated", "facilitated", "fine-tuned",
    "integrated", "leveraged", "monitored", "orchestrated", "pioneered",
    "prototyped", "published", "researched", "secured", "trained",
  ];

  const lowerText = bulletText.toLowerCase();
  return verbs.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(lowerText));
}

export function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>();
  if (!text) return keywords;

  // 1. Extract known tech terms and phrases (highest priority)
  const textTechTerms = extractTechTerms(text);
  for (const tech of textTechTerms) keywords.add(tech);

  // 2. Tokenise — preserve alphanumeric + + # . / (for framework names)
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#.\-\/]/g, " ");

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  // 3. Single-word extraction
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (TECH_MAP.has(word)) {
      keywords.add(TECH_MAP.get(word)!);
      continue;
    }
    if (!STOP_WORDS.has(word) && word.length > 2) {
      keywords.add(word);
    }
  }

  // 4. Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
    const bigram = `${w1} ${w2}`;
    if (TECH_MAP.has(bigram)) {
      keywords.add(TECH_MAP.get(bigram)!);
    } else {
      keywords.add(bigram);
    }
  }

  return keywords;
}
