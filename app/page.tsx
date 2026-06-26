"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Headphones,
  Wallet,
  Loader2,
  Play,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const spotlightRefs = useRef<HTMLDivElement[]>([]);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState<string | null>(null);

  const handleNavigate = (buttonId: string) => {
    setIsNavigating(buttonId);
    router.push("/dashboard");
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      spotlightRefs.current.forEach((card) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const addSpotlightRef = (el: HTMLDivElement | null) => {
    if (el && !spotlightRefs.current.includes(el)) {
      spotlightRefs.current.push(el);
    }
  };

  return (
    <div className="landing-page min-h-screen overflow-x-hidden selection:bg-primary selection:text-primary-foreground relative bg-[#faf9f6] text-[#15151c]">
      {/* Brand Gradient Hero Backdrop — blue hour fading into a warm sunset */}
      <div className="landing-hero-gradient absolute top-0 left-0 right-0 h-[1100px] z-0 overflow-hidden pointer-events-none" />

      {/* Navigation: Frosted Pill, Floating */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex w-full lg:w-fit max-w-[90vw] items-center justify-between rounded-full bg-white/45 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/50 border border-white/40 pt-1.5 pr-1.5 pb-1.5 pl-4 shadow-[0_8px_32px_rgba(2,12,40,0.14),inset_0_1px_0_rgba(255,255,255,0.65)] transition-all duration-300 hover:bg-white/60">
        {/* Logo Area */}
        <Link href="/" className="flex items-center mr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/opencraft_full_logo.svg"
            alt="OpenCraft"
            className="h-7 w-auto"
          />
        </Link>

        {/* Links (Hidden on small screens) */}
        <div className="hidden md:flex items-center gap-6 mr-8">
          <Link
            href="#features"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href="#philosophy"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Philosophy
          </Link>
          <Link
            href="/pricing"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* Action Button */}
        <Button
          size="sm"
          onClick={() => handleNavigate("nav")}
          disabled={isNavigating === "nav"}
          className="flex gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors group text-xs font-semibold rounded-full py-2 px-4 items-center disabled:opacity-70"
        >
          Get Started
          {isNavigating === "nav" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          )}
        </Button>
      </nav>

      {/* Main Content */}
      <main className="container lg:px-12 flex flex-col z-10 mx-auto pt-32 px-6 relative items-center">
        {/* Hero Text - Centered */}
        <div className="flex flex-col items-center text-center w-full max-w-3xl pt-12 pb-16">
          <div className="animate-slide-up relative inline-block mb-10">
            <h1 className="landing-text-glow lg:text-7xl leading-[1.05] text-4xl tracking-tight font-serif text-white px-3 py-1">
              Vibe design for
              <br />
              <span className="italic text-[#a9defc]">vibe coders.</span>
            </h1>

            {/* Canvas-style selection frame with corner handles */}
            <div
              aria-hidden="true"
              className="hero-select-frame pointer-events-none absolute -inset-2 rounded-[4px] border-2 border-[#0072e5]"
            >
              <span className="hero-handle tl" />
              <span className="hero-handle tr" />
              <span className="hero-handle bl" />
              <span className="hero-handle br" />
            </div>

            {/* Animated brand select-cursor that "clicks" the box into view */}
            <div
              aria-hidden="true"
              className="hero-select-cursor pointer-events-none absolute"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"
                  fill="#ffffff"
                  stroke="#0072e5"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <p className="animate-slide-up stagger-1 font-sans text-lg lg:text-xl font-light text-white/85 leading-relaxed tracking-tight max-w-xl mb-10">
            A simple yet powerful design tool for developers who want to level
            up their UI game. Intuitive canvas, AI-powered generation, sandboxes
            for live previews, and{" "}
            <span className="text-white font-medium">so much more</span>.
          </p>

          <div className="animate-slide-up stagger-2 flex flex-col sm:flex-row gap-3 items-center justify-center">
            {/* Primary — solid white pill, reads crisp on the gradient */}
            <button
              onClick={() => handleNavigate("hero")}
              disabled={isNavigating === "hero"}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0a4fb0] ring-1 ring-white/70 shadow-[0_10px_26px_-10px_rgba(2,12,40,0.5)] hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-12px_rgba(2,12,40,0.6)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isNavigating === "hero" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start Designing
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Secondary — frosted glass with a play badge */}
            <button className="group inline-flex items-center gap-2.5 rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md hover:bg-white/20 hover:border-white/60 transition-all duration-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                <Play className="h-2.5 w-2.5 fill-white text-white translate-x-px" />
              </span>
              <span className="tracking-tight">Watch Demo</span>
            </button>
          </div>
        </div>

        {/* Canvas Preview - Below Hero */}
        <div className="animate-scale-in stagger-3 w-full flex relative items-center justify-center pb-32">
          {/* Background Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[60%] bg-primary/25 blur-[120px] rounded-full opacity-60" />
          </div>

          {/* Canvas Image with Soft Frame */}
          <div className="relative w-full max-w-6xl group">
            {/* Outer Glow Ring */}
            <div className="absolute -inset-1 bg-primary/20 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Image Container */}
            <div className="relative rounded-xl overflow-hidden border border-white/70 ring-1 ring-slate-900/10 shadow-[0_30px_80px_-20px_rgba(2,12,40,0.45)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/canvas_resized.png"
                alt="OpenCraft Canvas - AI-powered design interface"
                className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-[1.01]"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section
        id="features"
        className="flex flex-col overflow-hidden lg:px-12 z-10 bg-[#faf9f6] w-full border-slate-200/70 border-t pt-32 px-6 pb-32 relative items-center"
      >
        {/* Clean Background Line */}
        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />

        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-4xl mb-20 relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-[#15151c] mb-6 leading-[1.1]">
            From <span className="italic text-slate-400">sketch</span> to{" "}
            <span className="text-primary">ship</span>,
            <br className="hidden sm:block" /> all in one place.
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl font-light">
            Your complete design-to-code workflow — draw, generate, edit, and
            export.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 z-10 w-full max-w-7xl relative auto-rows-[minmax(200px,auto)]">
          {/* Card 1: Infinite Canvas - Large Featured */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col md:col-span-2 lg:col-span-7 lg:row-span-2 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content - Top */}
            <div className="p-8 pb-4 relative z-10">
              <h3 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-[#15151c] mb-2">
                Infinite Canvas
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-light max-w-md">
                Sketch wireframes, brainstorm ideas, and draw shapes freely.
                Pan, zoom, and organize your thoughts on a limitless workspace.
              </p>
            </div>

            {/* Image Container - Bottom */}
            <div className="relative z-10 flex-1 min-h-[280px] overflow-hidden mt-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_1.png"
                alt="Infinite Canvas for wireframing"
                className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
            </div>
          </div>

          {/* Card 2: AI Chat Generation - Tall Right */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col lg:col-span-5 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Image */}
            <div className="relative z-10 w-full h-48 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_2.png"
                alt="AI-powered component generation"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
            </div>

            {/* Content */}
            <div className="p-6 relative z-10">
              <h3 className="text-lg font-semibold tracking-tight text-[#15151c] mb-2">
                AI Chat Generation
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Describe your UI in plain English. Get production-ready
                components with live preview.
              </p>
            </div>
          </div>

          {/* Card 3: Visual Editor - Small */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col lg:col-span-5 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Image */}
            <div className="relative z-10 w-full h-48 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_3.png"
                alt="Professional visual editor"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
            </div>

            {/* Content */}
            <div className="p-6 relative z-10">
              <h3 className="text-lg font-semibold tracking-tight text-[#15151c] mb-2">
                Visual Editor
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Edit components visually. Fine-tune styles without touching
                code.
              </p>
            </div>
          </div>

          {/* Card 4: Code Export - Wide */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col md:flex-row md:col-span-2 lg:col-span-8 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content - Left */}
            <div className="p-8 relative z-10 flex flex-col justify-center md:w-2/5">
              <h3 className="text-xl font-semibold tracking-tight text-[#15151c] mb-3">
                Ship to your <span className="text-primary">IDE</span>
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                Export clean, production-ready code. React, Next.js, and more —
                ready to ship.
              </p>
            </div>

            {/* Image - Right */}
            <div className="relative z-10 flex-1 min-h-[200px] md:min-h-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_4.png"
                alt="Export clean code to your IDE"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent opacity-70 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-70 md:hidden" />
            </div>
          </div>

          {/* Card 5: Frame to Design - Vertical */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col lg:col-span-4 lg:row-span-2 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

            {/* Image - Full height background */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_5.png"
                alt="Frame to design generation"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
            </div>

            {/* Content - Bottom frosted panel */}
            <div className="p-6 relative z-10 mt-auto">
              <div className="rounded-2xl border border-white/70 bg-white/80 backdrop-blur-md p-5 shadow-[0_8px_24px_-12px_rgba(2,12,40,0.3)]">
                <h3 className="text-xl font-semibold tracking-tight text-[#15151c] mb-2">
                  Frame to Design
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-light">
                  Sketch a wireframe and let AI bring it to life. Transform
                  rough ideas into polished designs instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Card 6: Chrome Extension - Wide bottom */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col md:flex-row-reverse md:col-span-2 lg:col-span-8 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content - Right */}
            <div className="p-8 relative z-10 flex flex-col justify-center md:w-1/2">
              <h3 className="text-xl font-semibold tracking-tight text-[#15151c] mb-3">
                Remix <span className="italic font-serif font-normal">any</span>{" "}
                component
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-light">
                See a component you love? Capture and remix it into your own
                customized version with our browser extension.
              </p>
            </div>

            {/* Image - Left */}
            <div className="relative z-10 flex-1 min-h-[200px] md:min-h-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_6.png"
                alt="Chrome extension for component remix"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-white via-transparent to-transparent opacity-70 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-70 md:hidden" />
            </div>
          </div>

          {/* Card 7: Create Flow - Full-width Flagship */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col lg:flex-row md:col-span-2 lg:col-span-12 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_30px_70px_-24px_rgba(0,114,229,0.3)] min-h-[360px]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Content - Left */}
            <div className="p-8 lg:p-12 relative z-10 flex flex-col justify-center lg:w-2/5">
              <h3 className="text-2xl md:text-3xl font-serif font-medium tracking-tight text-[#15151c] mb-3">
                Design your full{" "}
                <span className="text-primary italic">product flow</span>
              </h3>
              <p className="text-sm md:text-base text-slate-500 leading-relaxed font-light max-w-md">
                Generate screens straight onto the canvas and connect them into
                a complete, navigable flow. Map how users move through your
                product — from first screen to last — and watch each one come to
                life as a real, editable preview.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-medium text-primary">
                <span>See it in action</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Image - Right */}
            <div className="relative z-10 flex-1 min-h-[260px] lg:min-h-0 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-200/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_7.png"
                alt="Create Flow — turn a screen shape into a live sandbox preview"
                className="w-full h-full object-cover object-left-top group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white opacity-60 hidden lg:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white opacity-60 lg:hidden" />
            </div>
          </div>

          {/* Card 8: Design Systems - Half width */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col md:col-span-1 lg:col-span-6 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Image */}
            <div className="relative z-10 w-full h-52 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_8.png"
                alt="Design systems — use a curated system or build your own"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
            </div>

            {/* Content */}
            <div className="p-6 relative z-10">
              <h3 className="text-lg font-semibold tracking-tight text-[#15151c] mb-2">
                Design Systems
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Apply a curated design system in one click, or craft your own —
                colors, type, and components stay consistent across every
                screen.
              </p>
            </div>
          </div>

          {/* Card 9: Live Collaboration - Half width */}
          <div
            ref={addSpotlightRef}
            className="landing-spotlight-card group relative flex flex-col md:col-span-1 lg:col-span-6 rounded-[24px] border border-slate-200/80 bg-white overflow-hidden transition-all duration-500 shadow-[0_1px_2px_rgba(2,12,40,0.04),0_18px_44px_-26px_rgba(2,12,40,0.22)] hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(2,12,40,0.04),0_28px_60px_-24px_rgba(0,114,229,0.28)]"
          >
            <div className="landing-spotlight-bg pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="landing-spotlight-border pointer-events-none absolute inset-0 rounded-[24px] border border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Image */}
            <div className="relative z-10 w-full h-52 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/feature_9.png"
                alt="Live collaboration — design together with your team in real time"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-80" />
            </div>

            {/* Content */}
            <div className="p-6 relative z-10">
              <h3 className="text-lg font-semibold tracking-tight text-[#15151c] mb-2">
                Live Collaboration
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light">
                Collaborate with your team in real time — share a canvas, see
                each other&apos;s cursors, and build together, all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section
        id="philosophy"
        className="overflow-hidden flex flex-col px-6 md:px-8 lg:px-12 z-10 bg-[#faf9f6] w-full border-slate-200/70 border-t pt-32 pb-32 relative items-center"
      >
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 landing-grid-bg opacity-60 pointer-events-none" />

        <div className="max-w-7xl w-full relative z-10">
          {/* Header Group */}
          <div className="flex flex-col gap-6 mb-20 max-w-5xl">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-serif font-medium tracking-tight text-[#15151c] leading-[1.15]">
              Stop juggling between{" "}
              <span className="line-through text-slate-400 decoration-slate-300">
                Figma
              </span>
              ,{" "}
              <span className="line-through text-slate-400 decoration-slate-300">
                IDEs
              </span>
              , and{" "}
              <span className="line-through text-slate-400 decoration-slate-300">
                vibe coding tools
              </span>
              .
              <br />
              <span className="text-slate-400 italic">
                Let us handle the design.
              </span>
            </h2>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-end">
            {/* Visual / Portrait Block */}
            <div className="lg:col-span-4 relative group">
              <div className="relative w-full aspect-[3.5/4] rounded-[24px] overflow-hidden border border-slate-200/80 bg-slate-50 shadow-[0_18px_44px_-26px_rgba(2,12,40,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="./vibe_coder.png"
                  alt="Vibe Coder"
                  className="w-full h-full object-cover grayscale-[0.25] opacity-95 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent" />
                <div className="absolute top-5 left-5 right-5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="flex gap-1.5">
                    <div className="w-1 h-1 bg-slate-400 rounded-full" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full" />
                  </div>
                  <div className="px-2 py-0.5 rounded border border-slate-200 bg-white/80 backdrop-blur-md">
                    <span className="text-[9px] font-mono text-primary tracking-wider">
                      LIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote & Actions Block */}
            <div className="lg:col-span-8 flex flex-col justify-end h-full relative">
              {/* Quote */}
              <blockquote className="mb-12 relative">
                <svg
                  className="absolute -top-6 -left-8 w-6 h-6 text-slate-200"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                </svg>
                <p className="text-xl md:text-2xl lg:text-3xl text-slate-700 font-light leading-relaxed tracking-tight">
                  All-in-one vibe coding tools try to do everything and end up
                  generating AI slop. OpenCraft focuses on{" "}
                  <span className="text-primary font-medium">design</span> —
                  your IDE handles the rest. Each tool should do one thing
                  exceptionally well.
                </p>
              </blockquote>

              {/* Author */}
              <div className="mb-12 flex items-center gap-4">
                <div className="h-px w-8 bg-primary/40" />
              </div>

              {/* Bottom Row: Stat & CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-t border-slate-200/70 pt-8">
                {/* Metric Pill */}
                <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors group cursor-default shadow-sm">
                  <span className="text-[10px] md:text-xs text-slate-500 font-mono uppercase tracking-wide group-hover:text-slate-700 transition-colors">
                    The right tool for the{" "}
                    <span className="text-primary">right job</span>
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-primary transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleNavigate("philosophy")}
                  disabled={isNavigating === "philosophy"}
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-10px_rgba(0,114,229,0.6)] hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isNavigating === "philosophy" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Start Designing
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="flex lg:px-12 bg-[#faf9f6] w-full z-10 border-slate-200/70 border-t px-6 py-32 relative justify-center">
        <div className="w-full max-w-7xl bg-primary rounded-[32px] relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-end justify-between p-10 lg:p-24 group shadow-[0_40px_90px_-32px_rgba(0,114,229,0.55)]">
          {/* Animated Effects */}
          <div className="absolute inset-0 opacity-20 mix-blend-soft-light bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
          <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-white/20 blur-[120px] rounded-full pointer-events-none opacity-60 mix-blend-overlay group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />

          {/* Left Content */}
          <div className="relative z-10 flex flex-col max-w-2xl mb-12 lg:mb-0">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-white mb-8 leading-[1.05]">
              Ready to transform your{" "}
              <span className="opacity-70 italic">design workflow?</span>
            </h2>
          </div>

          {/* Right Content */}
          <div className="relative z-10 max-w-md pb-2 lg:text-right flex flex-col items-start lg:items-end gap-6">
            <p className="text-white/85 text-lg lg:text-xl font-medium leading-relaxed">
              Our AI-powered design tools are ready to help you create stunning
              interfaces in minutes, not hours.
            </p>

            <button
              onClick={() => handleNavigate("cta")}
              disabled={isNavigating === "cta"}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-primary hover:bg-white/90 transition-colors shadow-[0_10px_30px_-8px_rgba(2,12,40,0.45)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isNavigating === "cta" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start Designing
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lg:px-12 flex flex-col z-10 overflow-hidden bg-[#faf9f6] w-full border-slate-200/70 border-t pt-12 px-6 pb-12 relative items-center">
        {/* Background Grid */}
        <div className="absolute inset-0 landing-grid-bg [mask-image:linear-gradient(to_bottom,transparent,black_20%)] pointer-events-none" />

        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 relative z-10">
          {/* Brand Column */}
          <div className="lg:col-span-3 flex flex-col gap-8 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/opencraft_full_logo.svg"
              alt="OpenCraft"
              className="h-6 w-auto"
            />
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] font-light">
              Engineering the future of design. AI-powered, developer-friendly,
              and infinitely scalable.
            </p>
            {/* Socials */}
            <div className="flex gap-5 mt-4">
              <a
                href="#"
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="m17.687 3.063l-4.996 5.711l-4.32-5.711H2.112l7.477 9.776l-7.086 8.099h3.034l5.469-6.25l4.78 6.25h6.102l-7.794-10.304l6.625-7.571zm-1.064 16.06L5.654 4.782h1.803l10.846 14.34z" />
                </svg>
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12.001 2c-5.525 0-10 4.475-10 10a9.99 9.99 0 0 0 6.837 9.488c.5.087.688-.213.688-.476c0-.237-.013-1.024-.013-1.862c-2.512.463-3.162-.612-3.362-1.175c-.113-.288-.6-1.175-1.025-1.413c-.35-.187-.85-.65-.013-.662c.788-.013 1.35.725 1.538 1.025c.9 1.512 2.337 1.087 2.912.825c.088-.65.35-1.087.638-1.337c-2.225-.25-4.55-1.113-4.55-4.938c0-1.088.387-1.987 1.025-2.687c-.1-.25-.45-1.275.1-2.65c0 0 .837-.263 2.75 1.024a9.3 9.3 0 0 1 2.5-.337c.85 0 1.7.112 2.5.337c1.913-1.3 2.75-1.024 2.75-1.024c.55 1.375.2 2.4.1 2.65c.637.7 1.025 1.587 1.025 2.687c0 3.838-2.337 4.688-4.562 4.938c.362.312.675.912.675 1.85c0 1.337-.013 2.412-.013 2.75c0 .262.188.574.688.474A10.02 10.02 0 0 0 22 12c0-5.525-4.475-10-10-10" />
                </svg>
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 flex flex-col gap-6 pt-2">
            <h4 className="text-[#15151c] font-medium text-sm tracking-wide">
              Product
            </h4>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  API Reference
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  Changelog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="flex items-center gap-2 text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  System Status
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6 pt-2">
            <h4 className="text-[#15151c] font-medium text-sm tracking-wide">
              Company
            </h4>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  Press Kit
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-500 hover:text-primary text-sm transition-colors font-light"
                >
                  Legal
                </a>
              </li>
            </ul>
          </div>

          {/* Large Action Buttons */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-row gap-4 mt-8 lg:mt-0">
            <a
              href="#"
              className="flex-1 group relative p-7 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 flex flex-col justify-between h-36 lg:h-40 overflow-hidden shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[#15151c] font-medium text-sm tracking-wide">
                  Contact Sales
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="relative z-10 flex items-end justify-between">
                <Wallet className="h-8 w-8 text-primary/60 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </a>

            <a
              href="#"
              className="flex-1 group relative p-7 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 flex flex-col justify-between h-36 lg:h-40 overflow-hidden shadow-sm"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[#15151c] font-medium text-sm tracking-wide">
                  Help Center
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
              </div>
              <div className="relative z-10 flex items-end justify-between">
                <Headphones className="h-8 w-8 text-primary/60 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="w-full max-w-7xl mt-20 pt-8 border-t border-slate-200/70 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
          <span className="text-slate-400 text-xs font-mono tracking-wide">
            © 2026 OpenCraft Technologies. All rights reserved.
          </span>
          <div className="flex items-center gap-8">
            <span className="text-slate-400 text-xs font-mono border-l border-slate-200 pl-8"></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
