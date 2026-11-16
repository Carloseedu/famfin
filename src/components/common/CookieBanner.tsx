"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("famfin-cookie-accepted")
    if (!accepted) {
      // Pequeno delay para não aparecer imediatamente
      const timer = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  function handleAccept() {
    localStorage.setItem("famfin-cookie-accepted", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl border border-border p-3 flex items-center gap-3">
        <Cookie className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 text-xs text-muted-foreground">
          Usamos cookies essenciais para manter sua sessão ativa. Não usamos
          cookies de rastreamento ou publicidade. Veja nossa{" "}
          <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
        </div>
        <Button
          size="sm"
          onClick={handleAccept}
          className="shrink-0"
        >
          Entendi
        </Button>
        <button
          onClick={handleAccept}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
