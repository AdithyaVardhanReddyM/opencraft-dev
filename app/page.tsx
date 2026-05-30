"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Layers,
  Layout,
  MousePointer2,
  Sparkles,
  Wand2,
  Zap,
  CheckCircle2,
  Play,
  Star,
  Users,
  Globe,
  Palette,
  Code2,
  Cpu,
  ChevronRight,
  Quote,
  Check,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

// Animated counter component
function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Floating orb component
function FloatingOrb({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`absolute rounded-full blur-3xl animate-pulse ${className}`}
      style={{ animationDelay: `${delay}ms`, animationDuration: "4s" }}
    />
  );
}

export default function Page() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <FloatingOrb
          className="w-[800px] h-[800px] bg-primary/8 top-[-200px] left-[-200px]"
          delay={0}
        />
        <FloatingOrb
          className="w-[600px] h-[600px] bg-purple-500/8 top-[20%] right-[-100px]"
          delay={1000}
        />
        <FloatingOrb
          className="w-[500px] h-[500px] bg-blue-500/8 bottom-[10%] left-[10%]"
          delay={2000}
        />
        <FloatingOrb
          className="w-[400px] h-[400px] bg-primary/5 bottom-[-100px] right-[20%]"
          delay={3000}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tighter">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Layout className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              unit{" "}
              <span className="text-muted-foreground font-normal">{`{set}`}</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link
              href="#features"
              className="hover:text-foreground transition-colors relative group"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              href="#how-it-works"
              className="hover:text-foreground transition-colors relative group"
            >
              How it Works
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              href="#pricing"
              className="hover:text-foreground transition-colors relative group"
            >
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              href="#testimonials"
              className="hover:text-foreground transition-colors relative group"
            >
              Testimonials
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block transition-colors"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
          <div className="container relative mx-auto px-4 md:px-6 flex flex-col items-center text-center z-10">
            {/* Badge */}
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-lg shadow-primary/10">
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
              <span>Introducing AI-Powered Vibe Design</span>
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter max-w-5xl mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              <span className="bg-gradient-to-b from-foreground via-foreground to-foreground/40 bg-clip-text text-transparent">
                Design at the
              </span>
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-primary to-orange-400 bg-clip-text text-transparent">
                  speed of thought
                </span>
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                >
                  <path
                    d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="text-primary/40"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 leading-relaxed">
              The familiarity of Figma meets the generative power of AI. Create
              stunning interfaces just by{" "}
              <span className="text-foreground font-medium">
                describing the vibe
              </span>
              .
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Button
                size="lg"
                className="h-14 px-10 rounded-full text-base font-semibold group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300"
              >
                Start Designing Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-10 rounded-full text-base font-medium bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
              >
                <Play className="mr-2 h-5 w-5 fill-primary text-primary" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
              {[
                { value: 50000, suffix: "+", label: "Designers" },
                { value: 2, suffix: "M+", label: "Designs Created" },
                { value: 99, suffix: "%", label: "Satisfaction" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Hero Visual / UI Mockup */}
            <div className="mt-20 relative w-full max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-1000 delay-500">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-purple-500/20 to-blue-500/30 rounded-3xl blur-3xl -z-10 opacity-60" />

              <div className="relative rounded-2xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/10] group">
                {/* Mockup Header */}
                <div className="h-12 border-b border-border/50 bg-muted/30 flex items-center px-4 gap-3">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="h-6 w-64 rounded-lg bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                      unit-set.design/canvas/new-project
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded bg-muted/50" />
                    <div className="h-6 w-6 rounded bg-muted/50" />
                  </div>
                </div>

                {/* Mockup Body */}
                <div className="flex h-[calc(100%-48px)]">
                  {/* Sidebar */}
                  <div className="w-56 border-r border-border/50 bg-muted/20 p-4 hidden md:flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Layers className="h-4 w-4" />
                      Layers
                    </div>
                    <div className="space-y-2">
                      {[
                        "Hero Section",
                        "Navigation",
                        "Card Component",
                        "Button Group",
                      ].map((layer, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${
                            i === 2
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted/50"
                          } transition-colors cursor-pointer`}
                        >
                          <div
                            className={`w-2 h-2 rounded-sm ${
                              i === 2 ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                          {layer}
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Palette className="h-4 w-4" />
                        Colors
                      </div>
                      <div className="flex gap-1.5">
                        {[
                          "bg-primary",
                          "bg-purple-500",
                          "bg-blue-500",
                          "bg-green-500",
                          "bg-foreground",
                        ].map((color, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-md ${color} cursor-pointer hover:scale-110 transition-transform`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="flex-1 p-8 relative bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]">
                    {/* Floating Card 1 */}
                    <div
                      className="absolute top-8 left-8 w-72 h-44 rounded-xl border border-primary/40 bg-background/90 shadow-xl p-5 transform -rotate-2 transition-all duration-500 group-hover:-rotate-3 group-hover:scale-105"
                      style={{
                        transform: `rotate(-2deg) translate(${
                          mousePosition.x * 0.01
                        }px, ${mousePosition.y * 0.01}px)`,
                      }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="h-3 w-24 rounded bg-foreground/80" />
                          <div className="h-2 w-16 rounded bg-muted-foreground/30 mt-1.5" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                        <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                        <div className="h-2.5 w-3/4 rounded bg-muted-foreground/20" />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <div className="h-8 flex-1 rounded-lg bg-primary/20 flex items-center justify-center text-xs text-primary font-medium">
                          Accept
                        </div>
                        <div className="h-8 flex-1 rounded-lg bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">
                          Decline
                        </div>
                      </div>
                    </div>

                    {/* Floating Card 2 */}
                    <div
                      className="absolute top-16 right-12 w-64 h-72 rounded-xl border border-purple-500/40 bg-background/90 shadow-xl p-5 transform rotate-3 transition-all duration-500 group-hover:rotate-4 group-hover:scale-105 z-10"
                      style={{
                        transform: `rotate(3deg) translate(${
                          mousePosition.x * -0.01
                        }px, ${mousePosition.y * 0.01}px)`,
                      }}
                    >
                      <div className="w-full h-28 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4 flex items-center justify-center overflow-hidden">
                        <Wand2 className="h-10 w-10 text-purple-500/60 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-28 rounded bg-foreground/80" />
                        <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                        <div className="h-2.5 w-full rounded bg-muted-foreground/20" />
                      </div>
                      <div className="mt-4">
                        <div className="h-10 w-full rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-xs text-white font-medium">
                          Generate with AI
                        </div>
                      </div>
                    </div>

                    {/* AI Prompt Input */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[80%] max-w-lg">
                      <div className="relative">
                        <div className="h-14 rounded-2xl border border-primary/30 bg-background/90 shadow-lg flex items-center px-5 gap-3">
                          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          <span className="text-muted-foreground text-sm flex-1">
                            Create a modern dashboard with dark theme...
                            <span className="animate-pulse">|</span>
                          </span>
                          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <ArrowRight className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                          AI
                        </div>
                      </div>
                    </div>

                    {/* Cursor */}
                    <div
                      className="absolute top-1/2 left-1/2 transform translate-x-16 translate-y-8 animate-bounce"
                      style={{ animationDuration: "2s" }}
                    >
                      <MousePointer2 className="h-6 w-6 text-primary fill-primary drop-shadow-lg" />
                      <div className="ml-5 -mt-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                        Generating...
                      </div>
                    </div>
                  </div>

                  {/* Properties Panel */}
                  <div className="w-64 border-l border-border/50 bg-muted/20 p-4 hidden lg:flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Code2 className="h-4 w-4" />
                      Properties
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Position
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-8 rounded-md bg-muted/50 flex items-center justify-center text-xs">
                            X: 120
                          </div>
                          <div className="h-8 rounded-md bg-muted/50 flex items-center justify-center text-xs">
                            Y: 240
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Size
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-8 rounded-md bg-muted/50 flex items-center justify-center text-xs">
                            W: 288
                          </div>
                          <div className="h-8 rounded-md bg-muted/50 flex items-center justify-center text-xs">
                            H: 176
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">
                          AI Context
                        </div>
                        <div className="h-24 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-dashed border-primary/30 flex flex-col items-center justify-center text-xs text-muted-foreground p-3">
                          <Cpu className="h-5 w-5 text-primary mb-2" />
                          <span className="text-center">
                            Drop reference images or describe your vibe
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-16 border-y border-border/40 bg-muted/20">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-center text-sm font-medium text-muted-foreground mb-10 uppercase tracking-widest">
              Trusted by forward-thinking design teams worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8">
              {[
                { name: "Vercel", icon: "▲" },
                { name: "Stripe", icon: "◈" },
                { name: "Notion", icon: "◻" },
                { name: "Linear", icon: "◇" },
                { name: "Figma", icon: "◎" },
                { name: "Framer", icon: "◉" },
              ].map((company) => (
                <div
                  key={company.name}
                  className="flex items-center gap-2 text-lg font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
                >
                  <span className="text-2xl">{company.icon}</span>
                  {company.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Zap className="mr-2 h-3.5 w-3.5" />
                Powerful Features
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                Everything you need to{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  create magic
                </span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Unit {`{set}`} combines the precision of professional design
                tools with the intuition of generative AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Wand2 className="h-6 w-6" />,
                  title: "AI-Driven Generation",
                  description:
                    "Describe your interface in plain English. Watch as unit {set} generates fully editable, layer-based designs in seconds.",
                  gradient: "from-primary/20 to-orange-500/20",
                  iconBg: "from-primary to-orange-500",
                },
                {
                  icon: <Layers className="h-6 w-6" />,
                  title: "Figma-Style Editing",
                  description:
                    "Don't settle for static images. Every AI generation produces real vectors, auto-layout frames, and components.",
                  gradient: "from-purple-500/20 to-blue-500/20",
                  iconBg: "from-purple-500 to-blue-500",
                },
                {
                  icon: <Palette className="h-6 w-6" />,
                  title: "Vibe Matching",
                  description:
                    "Upload a moodboard or reference image. Our engine extracts the 'vibe'—colors, typography, spacing—and applies it.",
                  gradient: "from-pink-500/20 to-rose-500/20",
                  iconBg: "from-pink-500 to-rose-500",
                },
                {
                  icon: <Layout className="h-6 w-6" />,
                  title: "Smart Layouts",
                  description:
                    "Responsive by default. Elements automatically adjust as you resize, just like you'd expect from a modern design tool.",
                  gradient: "from-green-500/20 to-emerald-500/20",
                  iconBg: "from-green-500 to-emerald-500",
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: "Real-time Collaboration",
                  description:
                    "Work with your team in real-time. See cursors, leave comments, and iterate together on the infinite canvas.",
                  gradient: "from-blue-500/20 to-cyan-500/20",
                  iconBg: "from-blue-500 to-cyan-500",
                },
                {
                  icon: <Sparkles className="h-6 w-6" />,
                  title: "Design System Sync",
                  description:
                    "Automatically generate a design system from your explorations. Colors, type scales, and components, ready to export.",
                  gradient: "from-amber-500/20 to-yellow-500/20",
                  iconBg: "from-amber-500 to-yellow-500",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group relative p-8 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />
                  <div className="relative z-10">
                    <div
                      className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section
          id="how-it-works"
          className="py-32 bg-muted/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary),0.1),transparent_50%)]" />

          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Play className="mr-2 h-3.5 w-3.5" />
                How it Works
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                From idea to design in{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  three steps
                </span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                No more staring at blank canvases. Just describe what you want
                and let AI do the heavy lifting.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/50 via-purple-500/50 to-blue-500/50" />

              {[
                {
                  step: "01",
                  title: "Describe Your Vision",
                  description:
                    "Type a natural language prompt describing the interface you want. Be as detailed or as vague as you like.",
                  icon: <Wand2 className="h-8 w-8" />,
                  color: "primary",
                },
                {
                  step: "02",
                  title: "AI Generates Design",
                  description:
                    "Our AI understands design principles and creates a fully layered, editable design matching your description.",
                  icon: <Cpu className="h-8 w-8" />,
                  color: "purple-500",
                },
                {
                  step: "03",
                  title: "Refine & Export",
                  description:
                    "Fine-tune every detail with familiar design tools. Export to code, Figma, or production-ready assets.",
                  icon: <Code2 className="h-8 w-8" />,
                  color: "blue-500",
                },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="text-center">
                    <div
                      className={`relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-${item.color} to-${item.color}/60 flex items-center justify-center text-white mb-8 shadow-xl shadow-${item.color}/30 z-10`}
                    >
                      {item.icon}
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Star className="mr-2 h-3.5 w-3.5 fill-primary" />
                Testimonials
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                Loved by{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  designers worldwide
                </span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                See what our community has to say about their experience with
                Unit {`{set}`}.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote:
                    "Unit {set} has completely transformed my workflow. I can prototype ideas 10x faster than before. The AI understands exactly what I'm looking for.",
                  author: "Sarah Chen",
                  role: "Lead Designer at Vercel",
                  avatar: "SC",
                  rating: 5,
                },
                {
                  quote:
                    "The vibe matching feature is incredible. I upload a moodboard and it captures the essence perfectly. It's like having a design assistant that reads my mind.",
                  author: "Marcus Johnson",
                  role: "Creative Director at Linear",
                  avatar: "MJ",
                  rating: 5,
                },
                {
                  quote:
                    "Finally, a tool that bridges the gap between ideation and execution. The AI-generated designs are actually usable, not just pretty mockups.",
                  author: "Emily Rodriguez",
                  role: "Product Designer at Stripe",
                  avatar: "ER",
                  rating: 5,
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="relative p-8 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 group"
                >
                  <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/20 group-hover:text-primary/40 transition-colors" />
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star
                        key={j}
                        className="h-5 w-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="text-foreground/90 leading-relaxed mb-8">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="py-32 bg-muted/30 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(var(--primary),0.1),transparent_50%)]" />

          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Simple Pricing
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6">
                Choose your{" "}
                <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  perfect plan
                </span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Start free and scale as you grow. No hidden fees, no surprises.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  name: "Starter",
                  price: "Free",
                  description: "Perfect for trying out Unit {set}",
                  features: [
                    "5 AI generations per day",
                    "Basic design tools",
                    "Export to PNG/SVG",
                    "Community support",
                  ],
                  notIncluded: [
                    "Unlimited generations",
                    "Team collaboration",
                    "Priority support",
                  ],
                  cta: "Get Started",
                  popular: false,
                },
                {
                  name: "Pro",
                  price: "$19",
                  period: "/month",
                  description: "For professional designers",
                  features: [
                    "Unlimited AI generations",
                    "Advanced design tools",
                    "Export to Figma/Code",
                    "Vibe matching",
                    "Design system generation",
                    "Priority support",
                  ],
                  notIncluded: [],
                  cta: "Start Free Trial",
                  popular: true,
                },
                {
                  name: "Team",
                  price: "$49",
                  period: "/month",
                  description: "For design teams",
                  features: [
                    "Everything in Pro",
                    "Unlimited team members",
                    "Real-time collaboration",
                    "Shared design systems",
                    "Admin controls",
                    "Dedicated support",
                  ],
                  notIncluded: [],
                  cta: "Contact Sales",
                  popular: false,
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`relative p-8 rounded-2xl border ${
                    plan.popular
                      ? "border-primary bg-gradient-to-b from-primary/10 to-background shadow-xl shadow-primary/20"
                      : "border-border/50 bg-background/50"
                  } backdrop-blur-sm transition-all duration-300 hover:border-primary/50`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.notIncluded.map((feature, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-3 text-sm text-muted-foreground"
                      >
                        <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full h-12 rounded-xl font-semibold ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    variant={plan.popular ? "default" : "secondary"}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/5 to-blue-500/10" />
          <FloatingOrb
            className="w-[600px] h-[600px] bg-primary/20 -top-48 -right-48"
            delay={0}
          />
          <FloatingOrb
            className="w-[400px] h-[400px] bg-purple-500/20 -bottom-24 -left-24"
            delay={1500}
          />

          <div className="container relative mx-auto px-4 md:px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">
                Ready to set the{" "}
                <span className="bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  vibe
                </span>
                ?
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                Join thousands of designers who are shipping faster and
                exploring further with unit {`{set}`}.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button
                  size="lg"
                  className="h-16 px-12 rounded-full text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group"
                >
                  Get Started for Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-16 px-12 rounded-full text-lg font-medium bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 hover:border-primary/30"
                >
                  Contact Sales
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Free tier available forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 font-bold text-xl tracking-tighter mb-4">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Layout className="h-5 w-5 text-primary-foreground" />
                </div>
                <span>
                  unit{" "}
                  <span className="text-muted-foreground font-normal">{`{set}`}</span>
                </span>
              </div>
              <p className="text-muted-foreground max-w-xs mb-6">
                The AI-powered design tool for the modern web. Create stunning
                interfaces at the speed of thought.
              </p>
              <div className="flex gap-4">
                {["Twitter", "GitHub", "Discord", "LinkedIn"].map((social) => (
                  <Link
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Features",
                  "Integrations",
                  "Pricing",
                  "Changelog",
                  "Roadmap",
                ].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Documentation",
                  "Tutorials",
                  "Blog",
                  "Community",
                  "Help Center",
                ].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="hover:text-foreground transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {["About", "Careers", "Press", "Legal", "Contact"].map(
                  (item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="hover:text-foreground transition-colors"
                      >
                        {item}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border/40 text-sm text-muted-foreground">
            <p>&copy; 2024 Unit Set Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
