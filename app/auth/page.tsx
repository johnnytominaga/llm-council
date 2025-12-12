"use client";

import { useState } from "react";
import AuthForm from "@/components/AuthForm";
import Logo from "@/components/Logo";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <h1 className="text-3xl font-bold text-gray-100">LLM Council</h1>
          <p className="mt-2 text-neutral-400">
            Collaborative AI decision making
          </p>
        </div>
        <AuthForm
          mode={mode}
          onToggleMode={() => setMode(mode === "signin" ? "signup" : "signin")}
        />
      </div>
    </div>
  );
}
