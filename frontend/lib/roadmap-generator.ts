/**
 * High-value 90-Day "Watch & Build" Roadmap Generator for FastHire AI
 * Tailored to in-demand tech roles: AI Engineer, Data Analyst, Cloud Architect, Cybersecurity, Full-Stack, etc.
 */

export function generateSkillRoadmap(skill: string): string {
  const cleanSkill = skill.trim();
  const lower = cleanSkill.toLowerCase();

  // 1. AI Application Engineer / Generative AI / LLMs / Prompt Engineering / RAG / LangChain / Python AI
  if (
    lower.includes("ai") ||
    lower.includes("llm") ||
    lower.includes("rag") ||
    lower.includes("prompt") ||
    lower.includes("langchain") ||
    lower.includes("generative") ||
    lower.includes("openai") ||
    lower.includes("python") && (lower.includes("model") || lower.includes("agent"))
  ) {
    return (
      `# 🚀 90-Day "Watch & Build" Roadmap: AI Application Engineer\n` +
      `*Focus on practical implementation (building apps) rather than pure theory to land an AI Engineering role in shortest time.*\n\n` +
      `---\n\n` +
      `## 📅 Phase 1: Python Mastery & GenAI Basics (Weeks 1–4)\n` +
      `**Goal:** Write professional-grade Python and execute your first LLM API pipelines.\n` +
      `**What to Learn:**\n` +
      `- Advanced Python (Decorators, Generators, Async/Await)\n` +
      `- Calling OpenAI, Anthropic & Groq APIs\n` +
      `- Prompt Engineering principles & Structured JSON outputs\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Corey Schafer:** The gold standard for Python OOP & Async APIs.\n` +
      `- **Krish Naik:** Dedicated *Generative AI Playlist* covering foundations from scratch.\n` +
      `- **Tech With Tim:** Fast-paced Python AI project warmups.\n\n` +
      `---\n\n` +
      `## 📅 Phase 2: RAG, Vector DBs & LangChain / LlamaIndex (Weeks 5–8)\n` +
      `**Goal:** Build a production "Chat with PDF" app — the #1 skill hiring managers demand.\n` +
      `**What to Learn:**\n` +
      `- RAG (Retrieval-Augmented Generation): Connecting LLMs to custom documents\n` +
      `- LangChain & LlamaIndex frameworks\n` +
      `- Vector Databases: Pinecone, ChromaDB, or FAISS\n` +
      `- Embeddings & Semantic Similarity Search\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **James Briggs:** Unmatched tutorials on Vector Databases, Embeddings, and Pinecone.\n` +
      `- **Sam Witteveen:** In-depth walkthroughs of Llama 3, Mistral, and LangChain agents.\n` +
      `- **Alejandro AO - Software & AI:** Full code-along RAG apps built with Streamlit.\n\n` +
      `---\n\n` +
      `## 📅 Phase 3: Autonomous AI Agents & Tool Calling (Weeks 9–10)\n` +
      `**Goal:** Build multi-agent workflows that browse the web, write code, and execute tasks.\n` +
      `**What to Learn:**\n` +
      `- CrewAI & AutoGen multi-agent orchestration\n` +
      `- Function Calling & Tool Calling (Google Search, SQL execution)\n` +
      `- Agentic Memory & Planning\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Matthew Berman:** The go-to channel for AI Agent tools, CrewAI, and local LLMs.\n` +
      `- **Brandon Hancock:** Step-by-step guides on building CrewAI autonomous agents.\n\n` +
      `---\n\n` +
      `## 📅 Phase 4: Production & Cloud Deployment (Weeks 11–12)\n` +
      `**Goal:** Containerize your AI app and deploy live to the cloud for recruiters to test.\n` +
      `**What to Learn:**\n` +
      `- Docker containerization & FastAPI backend servers\n` +
      `- Cloud Hosting: Hugging Face Spaces, Render, or Vercel\n` +
      `- Cost optimization & LLM rate-limiting\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **TechWorld with Nana:** Easiest way to master Docker & DevOps.\n` +
      `- **ArjanCodes:** Professional software design patterns to ace technical interviews.\n\n` +
      `---\n\n` +
      `### ⚡ Daily Routine for Maximum Success:\n` +
      `1. **Morning:** Watch 1 tutorial from Krish Naik or James Briggs.\n` +
      `2. **Afternoon:** Code along line-by-line (never just watch).\n` +
      `3. **Weekend:** Build a micro-project for your GitHub portfolio.`
    );
  }

  // 2. Data Analytics / Data Science / SQL / Power BI / Tableau / Excel
  if (
    lower.includes("data") ||
    lower.includes("sql") ||
    lower.includes("power bi") ||
    lower.includes("tableau") ||
    lower.includes("pandas") ||
    lower.includes("analytics") ||
    lower.includes("bi")
  ) {
    return (
      `# 🚀 90-Day "Watch & Build" Roadmap: Data Analyst & Business Intelligence\n` +
      `*Master high-demand data analytics skills and build an impressive portfolio to land top analytics roles.*\n\n` +
      `---\n\n` +
      `## 📅 Phase 1: Advanced SQL & Data Manipulation (Weeks 1–4)\n` +
      `**Goal:** Write complex SQL queries and clean dirty real-world datasets.\n` +
      `**What to Learn:**\n` +
      `- SQL Joins, CTEs (Common Table Expressions), Window Functions (\`ROW_NUMBER\`, \`LEAD/LAG\`)\n` +
      `- Data Aggregations & Grouping logic\n` +
      `- Pandas & NumPy for data cleaning in Python\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Alex The Analyst:** Famous Data Analyst Bootcamp & SQL playlists.\n` +
      `- **Luke Barousse:** Python & SQL tutorials tailored for analytics.\n` +
      `- **Kaggle / Mode Analytics Tutorials:** Interactive real-world SQL practice.\n\n` +
      `---\n\n` +
      `## 📅 Phase 2: Interactive BI Dashboards & Visualizations (Weeks 5–8)\n` +
      `**Goal:** Build interactive dashboards that drive executive decision-making.\n` +
      `**What to Learn:**\n` +
      `- Power BI (DAX formulas, Power Query, Data Modeling)\n` +
      `- Tableau Desktop & Public dashboard design\n` +
      `- Business KPIs: Churn Rate, LTV, Conversion Funnels\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Chandoo:** Excel & Power BI reporting masterclasses.\n` +
      `- **Guy in a Cube:** Advanced Power BI techniques, DAX, and performance tuning.\n` +
      `- **Maven Analytics:** Real-world dashboard project walk-throughs.\n\n` +
      `---\n\n` +
      `## 📅 Phase 3: Exploratory Data Analysis & Statistics (Weeks 9–10)\n` +
      `**Goal:** Extract statistical insights and communicate data stories to non-technical stakeholders.\n` +
      `**What to Learn:**\n` +
      `- EDA using Matplotlib & Seaborn\n` +
      `- Descriptive Statistics & A/B Testing fundamentals\n` +
      `- Executive Presentation & Storytelling with Data\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **StatQuest with Josh Starmer:** Statistics concepts explained clearly.\n` +
      `- **Ken Jee:** Practical Data Science project guides and portfolio advice.\n\n` +
      `---\n\n` +
      `## 📅 Phase 4: Portfolio Projects & Deployment (Weeks 11–12)\n` +
      `**Goal:** Publish 3 polished projects on GitHub & Tableau Public.\n` +
      `**What to Learn:**\n` +
      `- Documenting GitHub repositories with clean READMEs\n` +
      `- Publishing live interactive dashboards on Tableau Public / NovyPro\n` +
      `- Resume optimization for Data Analyst job applications\n\n` +
      `---\n\n` +
      `### ⚡ Daily Routine for Maximum Success:\n` +
      `1. **Morning:** Watch 1 video from Alex The Analyst or Chandoo.\n` +
      `2. **Afternoon:** Solve 2 LeetCode / StrataScratch SQL problems.\n` +
      `3. **Weekend:** Build 1 complete Power BI dashboard project.`
    );
  }

  // 3. Cloud Architecture / Cloud Engineering (AWS / Azure / GCP / DevOps)
  if (
    lower.includes("cloud") ||
    lower.includes("aws") ||
    lower.includes("azure") ||
    lower.includes("gcp") ||
    lower.includes("devops") ||
    lower.includes("docker") ||
    lower.includes("kubernetes") ||
    lower.includes("terraform")
  ) {
    return (
      `# 🚀 90-Day "Watch & Build" Roadmap: Cloud & DevOps Architect\n` +
      `*Learn to architect, automate, and deploy enterprise infrastructure on AWS/Azure using Infrastructure as Code (IaC).*\n\n` +
      `---\n\n` +
      `## 📅 Phase 1: Cloud Fundamentals, Linux & Networking (Weeks 1–4)\n` +
      `**Goal:** Master Linux shell, networking concepts, and IAM security.\n` +
      `**What to Learn:**\n` +
      `- Linux CLI, Bash scripting & SSH keys\n` +
      `- Networking: VPCs, Subnets, CIDR blocks, Security Groups, Route 53\n` +
      `- Core Cloud Services: EC2, S3, IAM Roles & Policies\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **NetworkChuck:** High-energy Linux & Networking tutorials.\n` +
      `- **FreeCodeCamp / Andrew Brown (ExamPro):** Full AWS Solutions Architect Associate course.\n` +
      `- **TechWorld with Nana:** DevOps & Cloud fundamentals.\n\n` +
      `---\n\n` +
      `## 📅 Phase 2: Infrastructure as Code (IaC) & Automation (Weeks 5–8)\n` +
      `**Goal:** Automate cloud provisioning using Terraform & Ansible.\n` +
      `**What to Learn:**\n` +
      `- Terraform syntax, State management, Modules\n` +
      `- Ansible configuration management\n` +
      `- AWS CloudFormation / Azure ARM templates\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Anton Putra:** Practical Terraform & Kubernetes DevOps tutorials.\n` +
      `- **KodeKloud:** Hands-on lab walk-throughs for IaC.\n\n` +
      `---\n\n` +
      `## 📅 Phase 3: Containerization & Kubernetes (Weeks 9–10)\n` +
      `**Goal:** Containerize microservices and deploy them to managed Kubernetes (EKS/AKS).\n` +
      `**What to Learn:**\n` +
      `- Dockerfiles, Docker Compose, Image optimization\n` +
      `- Kubernetes Pods, Deployments, Services, Ingress Controllers\n` +
      `- AWS EKS or Azure AKS deployment\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **TechWorld with Nana:** Complete Docker & Kubernetes playlists.\n` +
      `- **Saiyam Pathak / KubeSimplify:** Cloud-native architecture & K8s.\n\n` +
      `---\n\n` +
      `## 📅 Phase 4: CI/CD Pipelines & Cloud Security (Weeks 11–12)\n` +
      `**Goal:** Build automated GitHub Actions pipelines with CloudWatch & Prometheus monitoring.\n` +
      `**What to Learn:**\n` +
      `- GitHub Actions / GitLab CI pipelines\n` +
      `- Prometheus & Grafana dashboard monitoring\n` +
      `- Cloud Security best practices & cost governance\n\n` +
      `---\n\n` +
      `### ⚡ Daily Routine for Maximum Success:\n` +
      `1. **Morning:** Watch 1 video from Andrew Brown or TechWorld with Nana.\n` +
      `2. **Afternoon:** Provision AWS/Azure resources using Terraform CLI.\n` +
      `3. **Weekend:** Build an automated CI/CD microservice deployment.`
    );
  }

  // 4. Cybersecurity / Ethical Hacking / SecOps / Network Security
  if (
    lower.includes("cyber") ||
    lower.includes("security") ||
    lower.includes("hacking") ||
    lower.includes("penetration") ||
    lower.includes("secops") ||
    lower.includes("network")
  ) {
    return (
      `# 🚀 90-Day "Watch & Build" Roadmap: Cybersecurity & Ethical Hacking\n` +
      `*Build hands-on penetration testing and security operations skills to land cybersecurity roles.*\n\n` +
      `---\n\n` +
      `## 📅 Phase 1: Networking & OS Foundations (Weeks 1–4)\n` +
      `**Goal:** Master TCP/IP networking, packet analysis, and Linux administration.\n` +
      `**What to Learn:**\n` +
      `- OSI Model, TCP/IP, DNS, DHCP, Firewalls\n` +
      `- Wireshark packet capture & analysis\n` +
      `- Linux CLI & Kali Linux tools\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **NetworkChuck:** Essential networking & Kali Linux tutorials.\n` +
      `- **David Bombal:** Wireshark & Cisco networking masterclasses.\n` +
      `- **Professor Messer:** CompTIA Security+ prep.\n\n` +
      `---\n\n` +
      `## 📅 Phase 2: Web App Penetration Testing (Weeks 5–8)\n` +
      `**Goal:** Master OWASP Top 10 web vulnerabilities.\n` +
      `**What to Learn:**\n` +
      `- Burp Suite Proxy & Interception\n` +
      `- SQL Injection (SQLi), Cross-Site Scripting (XSS), CSRF, IDOR\n` +
      `- TryHackMe / HackTheBox beginner machines\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **The Cyber Mentor (Heath Adams):** Practical Ethical Hacking course.\n` +
      `- **IppSec:** Legendary HackTheBox machine walkthroughs.\n` +
      `- **PortSwigger Web Security Academy:** Free interactive labs.\n\n` +
      `---\n\n` +
      `## 📅 Phase 3: Active Directory & Privilege Escalation (Weeks 9–10)\n` +
      `**Goal:** Learn enterprise Active Directory attacks and Linux/Windows privilege escalation.\n` +
      `**What to Learn:**\n` +
      `- Kerberoasting, Pass-the-Hash, BloodHound\n` +
      `- Linux & Windows Local Privilege Escalation scripts (LinPEAS/WinPEAS)\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **John Hammond:** Malware analysis & CTF challenges.\n` +
      `- **LiveOverflow:** Deep-dive exploit development & reverse engineering.\n\n` +
      `---\n\n` +
      `## 📅 Phase 4: SIEM, Incident Response & Certifications (Weeks 11–12)\n` +
      `**Goal:** Configure Splunk / Elastic SIEM for threat hunting & prepare for Sec+ or EJPT.\n` +
      `**What to Learn:**\n` +
      `- Splunk & Elastic SIEM log analysis\n` +
      `- Writing Incident Response reports\n` +
      `- Preparing for CompTIA Security+ or eJPT certification\n\n` +
      `---\n\n` +
      `### ⚡ Daily Routine for Maximum Success:\n` +
      `1. **Morning:** Watch 1 video from The Cyber Mentor or John Hammond.\n` +
      `2. **Afternoon:** Solve 1 TryHackMe room.\n` +
      `3. **Weekend:** Practice a complete HackTheBox machine.`
    );
  }

  // 5. Full-Stack / Software Engineering / React / Next.js / Node.js
  if (
    lower.includes("react") ||
    lower.includes("next") ||
    lower.includes("node") ||
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    lower.includes("frontend") ||
    lower.includes("backend") ||
    lower.includes("full") ||
    lower.includes("web")
  ) {
    return (
      `# 🚀 90-Day "Watch & Build" Roadmap: Full-Stack Web Engineer (${cleanSkill})\n` +
      `*Master modern full-stack development with Next.js, TypeScript, and serverless backends.*\n\n` +
      `---\n\n` +
      `## 📅 Phase 1: Modern TypeScript & React Mastery (Weeks 1–4)\n` +
      `**Goal:** Build clean, strongly-typed React components.\n` +
      `**What to Learn:**\n` +
      `- ES6+, Async/Await, Fetch API, Promises\n` +
      `- TypeScript Interfaces, Generics, and Types\n` +
      `- React Hooks (\`useState\`, \`useEffect\`, \`useContext\`, \`useMemo\`)\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Web Dev Simplified:** Short, crystal-clear React & TS guides.\n` +
      `- **Jack Herrington:** Advanced TypeScript & React architectural patterns.\n` +
      `- **Traversy Media:** Crash courses on web development.\n\n` +
      `---\n\n` +
      `## 📅 Phase 2: Next.js App Router & Server Actions (Weeks 5–8)\n` +
      `**Goal:** Build production full-stack web applications.\n` +
      `**What to Learn:**\n` +
      `- Next.js App Router, Server Components vs Client Components\n` +
      `- Server Actions & REST API Route Handlers\n` +
      `- Styling with TailwindCSS & Radix UI / Shadcn UI\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Code With Antonio:** Full-stack SaaS application tutorials.\n` +
      `- **Fireship:** Fast 100-second overviews & modern tech stack tips.\n` +
      `- **Josh Tried Coding:** Production Next.js & TypeScript apps.\n\n` +
      `---\n\n` +
      `## 📅 Phase 3: Databases, Authentication & State Management (Weeks 9–10)\n` +
      `**Goal:** Connect your frontend to PostgreSQL databases with Supabase or Prisma.\n` +
      `**What to Learn:**\n` +
      `- PostgreSQL, Supabase Auth & RLS policies\n` +
      `- Prisma ORM schema migrations\n` +
      `- Zustand / Redux State Management\n\n` +
      `📺 **Best YouTube Channels:**\n` +
      `- **Hussein Nasser:** Deep-dive Database architecture & HTTP protocol.\n` +
      `- **ByteByteGo:** System Design & Scalability animation guides.\n\n` +
      `---\n\n` +
      `## 📅 Phase 4: Testing, Deployment & Optimization (Weeks 11–12)\n` +
      `**Goal:** Deploy a live, performant SaaS application to Vercel.\n` +
      `**What to Learn:**\n` +
      `- Vercel deployment, Environment variables, Domain setup\n` +
      `- Performance optimization (Lighthouse scores, image optimization)\n` +
      `- Portfolio building for technical recruiters\n\n` +
      `---\n\n` +
      `### ⚡ Daily Routine for Maximum Success:\n` +
      `1. **Morning:** Watch 1 video from Code With Antonio or Web Dev Simplified.\n` +
      `2. **Afternoon:** Code features into your personal SaaS app.\n` +
      `3. **Weekend:** Push updates to your live GitHub repository.`
    );
  }

  // 6. Generic Fallback for any other custom skill (e.g. Java, C++, Mobile, Machine Learning)
  return (
    `# 🚀 90-Day "Watch & Build" Roadmap: ${cleanSkill}\n` +
    `*Master ${cleanSkill} through practical implementation, hands-on projects, and curated top tutorials.*\n\n` +
    `---\n\n` +
    `## 📅 Phase 1: Core Fundamentals & Syntax (Weeks 1–4)\n` +
    `**Goal:** Write clean, modular code in ${cleanSkill}.\n` +
    `**What to Learn:**\n` +
    `- Core syntax, Data Structures, and Control Flow of ${cleanSkill}\n` +
    `- Setting up your local IDE & Development Environment\n` +
    `- Basic debugging & Object-Oriented Programming (OOP)\n\n` +
    `📺 **Recommended Learning Channels:**\n` +
    `- **FreeCodeCamp:** Full beginner crash courses for ${cleanSkill}.\n` +
    `- **Traversy Media:** Fast-paced introductory tutorials.\n` +
    `- **Official Documentation:** Interactive quickstarts and guides.\n\n` +
    `---\n\n` +
    `## 📅 Phase 2: Intermediate Frameworks & Libraries (Weeks 5–8)\n` +
    `**Goal:** Integrate ${cleanSkill} with standard industry frameworks and APIs.\n` +
    `**What to Learn:**\n` +
    `- Standard libraries and package management\n` +
    `- Asynchronous execution, Multithreading, or Event Loops\n` +
    `- API Integration & Data Handling\n\n` +
    `📺 **Recommended Learning Channels:**\n` +
    `- **ArjanCodes:** Code architecture, design patterns, and clean code principles.\n` +
    `- **Web Dev Simplified / Fireship:** Conceptual breakdowns & best practices.\n\n` +
    `---\n\n` +
    `## 📅 Phase 3: Real-World Micro-Projects (Weeks 9–10)\n` +
    `**Goal:** Build 2 functional projects demonstrating ${cleanSkill} in action.\n` +
    `**What to Learn:**\n` +
    `- *Project 1:* Command-line utility or standalone script using ${cleanSkill}\n` +
    `- *Project 2:* Full-featured application connecting to a database\n` +
    `- Writing unit tests & error handling\n\n` +
    `---\n\n` +
    `## 📅 Phase 4: Production Deployment & Portfolio (Weeks 11–12)\n` +
    `**Goal:** Publish your projects to GitHub with detailed documentation.\n` +
    `**What to Learn:**\n` +
    `- GitHub documentation with clean README files and screenshots\n` +
    `- Containerizing your project with Docker\n` +
    `- Tailoring your resume to highlight ${cleanSkill} in bullet points\n\n` +
    `---\n\n` +
    `### ⚡ Daily Routine for Maximum Success:\n` +
    `1. **Morning:** Watch 1 focused tutorial on ${cleanSkill}.\n` +
    `2. **Afternoon:** Write code for 60-90 minutes.\n` +
    `3. **Weekend:** Commit micro-project updates to GitHub.`
  );
}
