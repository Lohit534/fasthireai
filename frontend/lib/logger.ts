const isProd = process.env.NODE_ENV === "production";

function sanitize(val: any, seen = new WeakSet()): any {
  if (typeof val === "string") {
    if (val.includes("@") || val.length > 100) {
      return "[FILTERED_PII_OR_LONG_TEXT]";
    }
    return val;
  }
  if (val instanceof Error) {
    return {
      name: val.name,
      message: val.message,
      stack: val.stack ? "[FILTERED_STACK_TRACE]" : undefined
    };
  }
  if (val && typeof val === "object") {
    if (seen.has(val)) {
      return "[CIRCULAR]";
    }
    seen.add(val);
    
    if (Array.isArray(val)) {
      return val.map(item => sanitize(item, seen));
    }
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      sanitizedObj[key] = sanitize(val[key], seen);
    }
    return sanitizedObj;
  }
  return val;
}

function getTimestamp(): string {
  return `[${new Date().toISOString()}]`;
}

export const logger = {
  info: (...args: any[]) => {
    if (isProd) return;
    const sanitizedArgs = args.map(sanitize);
    console.log(getTimestamp(), "[INFO]", ...sanitizedArgs);
  },
  warn: (...args: any[]) => {
    if (isProd) return;
    const sanitizedArgs = args.map(sanitize);
    console.warn(getTimestamp(), "[WARN]", ...sanitizedArgs);
  },
  error: (...args: any[]) => {
    if (isProd) return;
    const sanitizedArgs = args.map(sanitize);
    console.error(getTimestamp(), "[ERROR]", ...sanitizedArgs);
  },
  debug: (...args: any[]) => {
    if (isProd) return;
    const sanitizedArgs = args.map(sanitize);
    console.debug(getTimestamp(), "[DEBUG]", ...sanitizedArgs);
  },
};
