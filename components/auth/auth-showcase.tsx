"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  Lightning,
  Microphone,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { PRODUCT_NAME } from "@/lib/brand/config";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    id: "summary",
    badge: "Resumo automático",
    title: "Decisões e action items em segundos",
    lines: [
      { speaker: "Ana", text: "Vamos priorizar o lançamento em março." },
      { speaker: "Pedro", text: "Concordo. Eu cuido do follow-up com o time." },
    ],
    chips: ["Lançamento em março", "Follow-up com time"],
  },
  {
    id: "transcript",
    badge: "Transcrição ao vivo",
    title: "Cada palavra indexada e pesquisável",
    lines: [
      { speaker: "Bot", text: "ReuniAI entrou na call com câmera ligada." },
      { speaker: "Cliente", text: "Podemos gravar para revisar depois?" },
    ],
    chips: ["Busca global", "Speakers identificados"],
  },
  {
    id: "prep",
    badge: "Prep inteligente",
    title: "Chegue na call já contextualizado",
    lines: [
      { speaker: "IA", text: "Na última reunião vocês decidiram migrar o CRM." },
      { speaker: "IA", text: "3 action items ainda estão em aberto." },
    ],
    chips: ["Histórico da série", "Briefing por e-mail"],
  },
] as const;

const STATS = [
  { value: "100%", label: "privado por usuário" },
  { value: "LGPD", label: "retenção e delete" },
  { value: "PT-BR", label: "IA e interface" },
] as const;

export function AuthShowcase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const slide = SLIDES[index]!;

  return (
    <div className="relative flex h-full min-h-[640px] flex-col justify-between overflow-hidden p-8 text-white lg:p-10 xl:p-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="auth-aurora auth-aurora-a" />
        <div className="auth-aurora auth-aurora-b" />
        <div className="auth-grid absolute inset-0 opacity-[0.35]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.2),transparent_42%)]" />
      </div>

      <div className="relative">
        <ReuniaiLogo inverse />
      </div>

      <div className="relative space-y-8">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
            <Lightning size={14} weight="fill" />
            Inteligência de reuniões
          </p>
          <h2 className="max-w-lg text-3xl font-semibold leading-[1.15] tracking-tight xl:text-4xl">
            Suas calls viram memória organizada
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            {PRODUCT_NAME} grava, transcreve e resume com IA — da agenda ou com um link colado na hora.
          </p>
        </div>

        <div className="relative max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-white/15">
                    <VideoCamera size={14} weight="duotone" />
                  </span>
                  Sprint Planning · 42 min
                </div>
                <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  Ao vivo
                </span>
              </div>

              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
                {slide.badge}
              </p>
              <p className="mb-4 text-base font-medium leading-snug">{slide.title}</p>

              <div className="space-y-2.5 rounded-xl bg-black/20 p-3">
                {slide.lines.map((line) => (
                  <div key={`${slide.id}-${line.speaker}`} className="flex gap-2 text-sm">
                    <Microphone size={14} className="mt-0.5 shrink-0 text-sky-200" />
                    <p>
                      <span className="font-medium text-white/90">{line.speaker}:</span>{" "}
                      <span className="text-white/75">{line.text}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {slide.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-white/85"
                  >
                    <Sparkle size={11} weight="fill" />
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex gap-2">
            {SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-8 bg-white" : "w-2 bg-white/35 hover:bg-white/55"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/12 bg-white/8 px-3 py-3 backdrop-blur-sm"
            >
              <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
              <p className="text-[11px] leading-snug text-white/65">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <CheckCircle size={14} />
          Gravação com consentimento dos participantes
        </p>
      </div>
    </div>
  );
}
