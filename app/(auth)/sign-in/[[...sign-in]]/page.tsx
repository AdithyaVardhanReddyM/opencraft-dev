import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function Page() {
  return (
    <SignIn
      appearance={{
        baseTheme: dark,
        elements: {
          rootBox: "w-full",
          card: "bg-transparent shadow-none p-0",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "bg-accent border-border/50 hover:bg-accent/80 text-foreground",
          formFieldLabel: "text-muted-foreground",
          formFieldInput:
            "bg-background/60 border-border/50 text-foreground focus:border-primary focus:ring-primary/50",
          footerActionLink: "text-primary hover:text-primary/80",
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-primary-foreground",
          dividerLine: "bg-border/50",
          dividerText: "text-muted-foreground",
        },
      }}
    />
  );
}
