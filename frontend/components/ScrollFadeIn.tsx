"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollFadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Delay in ms
  direction?: "up" | "down" | "left" | "right" | "none";
  threshold?: number;
}

export default function ScrollFadeIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
  threshold = 0.05
}: ScrollFadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay, threshold]);

  // Setup translation classes depending on direction
  let transformClass = "translate-y-0 translate-x-0 opacity-100";
  if (!isVisible) {
    switch (direction) {
      case "up":
        transformClass = "translate-y-8 opacity-0";
        break;
      case "down":
        transformClass = "-translate-y-8 opacity-0";
        break;
      case "left":
        transformClass = "translate-x-8 opacity-0";
        break;
      case "right":
        transformClass = "-translate-x-8 opacity-0";
        break;
      case "none":
        transformClass = "opacity-0";
        break;
    }
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${transformClass} ${className}`}
    >
      {children}
    </div>
  );
}
