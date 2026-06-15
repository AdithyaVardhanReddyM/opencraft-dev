import { ReactNode } from "react";
import Image from "next/image";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex text-white relative">
      {/* Full page gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(0, 114, 229, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(0, 114, 229, 0.1) 0%, transparent 50%), linear-gradient(to bottom, #030303, #0a0505)",
        }}
      />

      {/* Left Side - Auth Form */}
      <div className="w-full lg:w-1/2 min-h-screen relative z-10">
        <div className="min-h-screen flex items-center justify-center p-8 lg:p-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 p-4 items-center justify-center">
        <div className="relative w-full h-[calc(100vh-2rem)] rounded-xl overflow-hidden">
          <Image
            src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/d6352abc-7eb1-4adc-858b-e7162b273559_1600w.webp"
            alt="Astronaut"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
