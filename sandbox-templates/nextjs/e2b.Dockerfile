# You can use most Debian-based base images
FROM node:21-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

# create-next-app@15.3.3 scaffolds Tailwind v4 (CSS-first config via @theme in
# globals.css, no tailwind.config.*) on Next 15.3.3 + React 19.
RUN npx --yes create-next-app@15.3.3 . --yes

# Allow external stock images (Unsplash, LoremFlickr, etc.) to load via
# next/image without any per-host domain config. `unoptimized: true` skips the
# image optimizer entirely, so ANY remote URL renders with no "hostname is not
# configured under images" errors — and plain <img> tags always work too.
RUN rm -f next.config.js next.config.mjs && printf '%s\n' \
  'import type { NextConfig } from "next";' \
  '' \
  'const nextConfig: NextConfig = {' \
  '  images: {' \
  '    unoptimized: true,' \
  '  },' \
  '};' \
  '' \
  'export default nextConfig;' \
  > next.config.ts

# shadcn's `init` step is broken against the current registry (it fails with
# "Cannot read properties of undefined (reading 'value')" BEFORE it writes the
# theme tokens and lib/utils.ts). That leaves globals.css without the shadcn
# design tokens (--primary, --card, --border, --muted, --ring, .dark, …) and no
# `cn` helper, so every component and every AI-generated class like bg-card /
# bg-primary / border-border renders unstyled and components fail to compile.
#
# So we bake the shadcn (Tailwind v4, base color "neutral", new-york) setup in
# directly — globals.css carries the full token set from shadcn's own registry —
# and use only `shadcn add` (which DOES work) to pull the components.
COPY globals.css /home/user/nextjs-app/app/globals.css
COPY components.json /home/user/nextjs-app/components.json
COPY utils.ts /home/user/nextjs-app/lib/utils.ts

# Runtime deps the shadcn components + lib/utils rely on. tw-animate-css backs
# the `@import "tw-animate-css"` in globals.css (Tailwind v4 animation utilities).
RUN npm install class-variance-authority clsx tailwind-merge tw-animate-css lucide-react

# Pull all shadcn/ui components (init is intentionally skipped above; add works).
RUN npx --yes shadcn@2.6.3 add --all --yes

# `add --all` installs react-day-picker@10 (calendar's dep), but the registry's
# calendar.tsx uses the v9 classNames API (the `table` key was removed in v10),
# which breaks `tsc --noEmit`. Pin it back to v9 AFTER add so the calendar — and
# the agent's required tsc validation — pass cleanly.
RUN npm install react-day-picker@9

# OpenCraft → Figma "Copy to Figma" bridge. `instrumentation-client.ts` runs on
# the client for every route (Next 15.3 client instrumentation), so it listens
# for the parent canvas's serialize request on whatever page the iframe shows,
# without the agent's generated `app/` code needing to know about it. Figit
# (@figit/dom-to-figma) converts the rendered DOM into Figma's clipboard format.
COPY instrumentation-client.ts /home/user/nextjs-app/instrumentation-client.ts
# Pinned: @figit/dom-to-figma is pre-1.0; the bridge is written against the
# 0.0.2 API (createFigmaConverter().convert(...).toClipboardHtml()).
RUN npm install @figit/dom-to-figma@0.0.2

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app
