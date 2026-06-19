import { PricingTable } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Zap, RefreshCcw } from "lucide-react";

// Brand palette — keep the Clerk table in step with the app's light theme.
const BRAND = {
  primary: "#0072E5", // OpenCraft blue
  text: "#3D3A33", // warm near-black (matches --foreground)
  textSecondary: "#8A867C", // warm gray (matches --muted-foreground)
  surface: "#FFFFFF",
  surfaceAlt: "#F7F6F2",
};

export default function PricingPage() {
  return (
    <div className="relative isolate flex h-screen flex-col overflow-hidden bg-background">
      {/* Background atmosphere */}
      <div className="absolute inset-0 -z-10">
        {/* Brand-tinted grid that fades toward the edges */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,114,229,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,114,229,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage:
              "radial-gradient(ellipse 75% 55% at 50% 0%, black 25%, transparent 78%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 55% at 50% 0%, black 25%, transparent 78%)",
          }}
        />
        {/* Soft blue halo behind the cards */}
        <div className="absolute left-1/2 top-24 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
        {/* Cyan accent glow */}
        <div className="absolute -right-10 bottom-0 h-[360px] w-[360px] translate-y-1/3 rounded-full bg-[#75D8FC]/25 blur-[130px]" />
      </div>

      {/* Everything centered within a single viewport */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center duration-700 animate-in fade-in slide-in-from-bottom-3">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Image
              src="/opencraft_full_logo.svg"
              alt="OpenCraft"
              width={260}
              height={54}
              priority
            />
          </Link>

          <h1
            className="mt-5 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-fraunces), serif" }}
          >
            Choose Your{" "}
            <span className="gradient-text-warm italic">Perfect Plan</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Start designing in minutes. Upgrade as your ideas scale, switch or
            cancel anytime.
          </p>
        </div>

        {/* Clerk Pricing Table — light theme tuned to the brand */}
        <div
          className="mx-auto mt-9 w-full max-w-4xl duration-700 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
          style={{ animationDelay: "140ms" }}
        >
          <PricingTable
            appearance={{
              variables: {
                colorPrimary: BRAND.primary,
                colorBackground: BRAND.surface,
                colorText: BRAND.text,
                colorTextSecondary: BRAND.textSecondary,
                colorInputBackground: BRAND.surface,
                colorInputText: BRAND.text,
                colorShimmer: BRAND.primary,
                borderRadius: "1rem",
                fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui",
              },
              elements: {
                rootBox: "w-full",
                // Standard card
                pricingTableCard:
                  "border border-border bg-white shadow-lg shadow-primary/5 rounded-2xl",
                // Featured card — blue halo + ring instead of orange
                pricingTableCardFeatured:
                  "border-2 border-primary/40 bg-gradient-to-b from-primary/[0.06] via-white to-white shadow-[0_24px_70px_-20px] shadow-primary/40 ring-1 ring-primary/10",
                pricingTableCardHeader: "p-6 pb-4",
                pricingTableCardPlanName:
                  "text-xl font-semibold text-foreground",
                pricingTableCardPlanDescription:
                  "text-sm text-muted-foreground mt-1",
                pricingTableCardPriceSection: "px-6 pb-4",
                pricingTableCardPrice:
                  "text-5xl font-bold tracking-tight text-foreground",
                pricingTableCardPricePeriod: "text-muted-foreground ml-1",
                pricingTableCardFeaturesList: "px-6 py-4 space-y-3",
                pricingTableCardFeaturesListItem:
                  "flex items-center gap-3 text-sm text-foreground/90",
                pricingTableCardFeaturesListItemIcon: "text-primary w-4 h-4",
                pricingTableCardAction: "p-6 pt-4",
                // Non-featured CTA — calm neutral surface
                pricingTableCardActionButton:
                  "w-full h-12 rounded-xl font-medium text-base transition-all bg-secondary hover:bg-accent text-secondary-foreground border border-border",
                // Featured CTA — solid brand blue
                pricingTableCardActionButtonFeatured:
                  "w-full h-12 rounded-xl font-medium text-base transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30",
                // "Active"/featured badge — brand blue pill
                pricingTableCardBadge:
                  "px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide",
                // Billing toggle
                pricingTableBillingToggle:
                  "flex items-center justify-center gap-4 mb-8",
                pricingTableBillingToggleLabel:
                  "text-sm text-muted-foreground",
                pricingTableBillingToggleLabelActive:
                  "text-sm text-foreground font-medium",
                pricingTableBillingToggleSwitch:
                  "data-[state=checked]:bg-primary",
              },
            }}
          />
        </div>

        {/* Trust row */}
        <div
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground duration-700 animate-in fade-in fill-mode-both"
          style={{ animationDelay: "260ms" }}
        >
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Secured by Clerk
          </span>
          <span className="size-1 rounded-full bg-border" />
          <span className="inline-flex items-center gap-2">
            <RefreshCcw className="size-4 text-primary" />
            Cancel anytime
          </span>
          <span className="size-1 rounded-full bg-border" />
          <span className="inline-flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            Instant access
          </span>
        </div>
      </div>
    </div>
  );
}
