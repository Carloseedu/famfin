"use client";

import { useState } from "react";
import { Wallet, Shield, FileText, Lock, Mail } from "lucide-react"
import { LegalModal, useLegalModal } from "./LegalModal"

type LegalType = "privacidade" | "termos" | "seguranca"

export function Footer() {
  const modal = useLegalModal()
  const [hovered, setHovered] = useState<string | null>(null)

  const links = [
    { key: "privacidade", label: "Privacidade", icon: Shield },
    { key: "termos", label: "Termos", icon: FileText },
    { key: "seguranca", label: "Segurança", icon: Lock },
  ] as const

  return (
    <>
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            <span>FamFin · {new Date().getFullYear()}</span>
            <span className="hidden sm:inline">· Gestão Financeira Familiar</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {links.map((link) => (
              <button
                key={link.key}
                onClick={() => modal.openModal(link.key as LegalType)}
                onMouseEnter={() => setHovered(link.key)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center gap-1.5 transition-colors ${
                  hovered === link.key ? "text-primary" : "hover:text-foreground"
                }`}
              >
                <link.icon className="h-3 w-3" />
                {link.label}
              </button>
            ))}
            <a
              href="mailto:suporte@famfin.com.br"
              onMouseEnter={() => setHovered("contato")}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-1.5 transition-colors ${
                hovered === "contato" ? "text-primary" : "hover:text-foreground"
              }`}
            >
              <Mail className="h-3 w-3" />
              Contato
            </a>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Dados criptografados · LGPD</span>
          </div>
        </div>
      </footer>

      <LegalModal type={modal.type} open={modal.open} onOpenChange={modal.setOpen} />
    </>
  )
}
