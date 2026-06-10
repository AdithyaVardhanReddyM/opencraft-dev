import { PricingTable } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="h-screen bg-background relative isolate overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] translate-y-1/2" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <div className="text-center space-y-6 mb-12">
          <Link href="/" className="flex justify-center">
            <Image
              src="/unitset_logo.svg"
              alt="UnitSet"
              width={80}
              height={80}
            />
          </Link>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            Choose Your <span className="gradient-text-warm">Perfect Plan</span>
          </h1>
        </div>

        {/* Clerk Pricing Table */}
        <div className="max-w-4xl mx-auto">
          <PricingTable
            appearance={{
              variables: {
                colorPrimary: "oklch(0.7114 0.1728 56.6323)",
                colorBackground: "oklch(0.2679 0.0036 106.6427)",
                colorText: "oklch(0.9818 0.0054 95.0986)",
                colorTextSecondary: "oklch(0.7713 0.0169 99.0657)",
                colorInputBackground: "oklch(0.3085 0.0035 106.6039)",
                colorInputText: "oklch(0.9818 0.0054 95.0986)",
                borderRadius: "0.75rem",
                fontFamily: "Geist, ui-sans-serif, sans-serif, system-ui",
              },
              elements: {
                // Root container
                rootBox: "w-full",
                // Card styling
                pricingTableCard:
                  "border border-border/50 bg-card shadow-xl rounded-2xl transition-all duration-300 hover:border-border hover:shadow-2xl",
                // Featured/highlighted card with orange glow
                pricingTableCardFeatured:
                  "border-2 border-primary/60 bg-linear-to-b from-primary/10 via-card to-card shadow-[0_0_60px_-10px] shadow-primary/40",
                // Card header
                pricingTableCardHeader: "p-6 pb-4",
                // Plan name
                pricingTableCardPlanName:
                  "text-xl font-semibold text-foreground",
                // Plan description
                pricingTableCardPlanDescription:
                  "text-sm text-muted-foreground mt-1",
                // Price section
                pricingTableCardPriceSection: "px-6 pb-4",
                pricingTableCardPrice: "text-5xl font-bold text-foreground",
                pricingTableCardPricePeriod: "text-muted-foreground ml-1",
                // Features list
                pricingTableCardFeaturesList: "px-6 py-4 space-y-3",
                pricingTableCardFeaturesListItem:
                  "flex items-center gap-3 text-sm text-foreground/90",
                pricingTableCardFeaturesListItemIcon: "text-primary w-4 h-4",
                // CTA button
                pricingTableCardAction: "p-6 pt-4",
                pricingTableCardActionButton:
                  "w-full h-12 rounded-lg font-medium text-base transition-all bg-secondary hover:bg-secondary/80 text-secondary-foreground",
                pricingTableCardActionButtonFeatured:
                  "w-full h-12 rounded-lg font-medium text-base transition-all bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25",
                // Badge for featured plan
                pricingTableCardBadge:
                  "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium",
                // Billing toggle
                pricingTableBillingToggle:
                  "flex items-center justify-center gap-4 mb-8",
                pricingTableBillingToggleLabel: "text-sm text-muted-foreground",
                pricingTableBillingToggleLabelActive: "text-sm text-foreground",
                pricingTableBillingToggleSwitch:
                  "data-[state=checked]:bg-primary",
              },
            }}
          />
        </div>

        {/* Footer Note */}
      </div>
    </div>
  );
}
