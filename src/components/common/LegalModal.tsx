"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PRIVACIDADE_TEXT, TERMOS_TEXT, SEGURANCA_TEXT } from "@/lib/legal"
import { Shield, FileText, Lock } from "lucide-react"

type LegalType = "privacidade" | "termos" | "seguranca"

const TITULOS = {
  privacidade: "Política de Privacidade",
  termos: "Termos de Uso",
  seguranca: "Segurança da Plataforma",
}

const ICONS = {
  privacidade: Shield,
  termos: FileText,
  seguranca: Lock,
}

const TEXTS = {
  privacidade: PRIVACIDADE_TEXT,
  termos: TERMOS_TEXT,
  seguranca: SEGURANCA_TEXT,
}

export function LegalModal({
  type,
  open,
  onOpenChange,
}: {
  type: LegalType | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!type) return null
  const Icon = ICONS[type]
  const text = TEXTS[type]
  const titulo = TITULOS[type]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
            {text.trim()}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function useLegalModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<LegalType | null>(null)

  function openModal(t: LegalType) {
    setType(t)
    setOpen(true)
  }

  return { open, type, setOpen, openModal }
}
