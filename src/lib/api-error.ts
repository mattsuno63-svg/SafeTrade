/**
 * Error handling centralizzato per API routes.
 *
 * Regola d'oro: MAI esporre error.message al client.
 * Il client riceve un messaggio generico, i dettagli restano nei log server-side.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

// ────────────────────────────────────────────────────────────────
// API Error class
// ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public clientMessage: string,
    public internalMessage?: string,
  ) {
    super(internalMessage || clientMessage)
    this.name = 'ApiError'
  }

  toResponse() {
    return NextResponse.json(
      { error: this.clientMessage },
      { status: this.statusCode },
    )
  }
}

// ────────────────────────────────────────────────────────────────
// Error handler
// ────────────────────────────────────────────────────────────────

/**
 * Gestisce errori nelle API routes in modo sicuro.
 * - ZodError → 400 con dettagli validazione
 * - ApiError → status code + messaggio client-safe
 * - Prisma known errors → messaggi generici
 * - Tutto il resto → 500 "Internal server error"
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // ── Zod validation error ──
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Dati non validi', details: error.errors },
      { status: 400 },
    )
  }

  // ── ApiError esplicito ──
  if (error instanceof ApiError) {
    if (error.internalMessage) {
      console.error(`[API${context ? ` ${context}` : ''}]`, error.internalMessage)
    }
    return error.toResponse()
  }

  // ── Errori Prisma noti ──
  if (error instanceof Error) {
    // Unique constraint violation
    if (error.message.includes('Unique constraint')) {
      console.error(`[API${context ? ` ${context}` : ''}] Unique constraint:`, error.message)
      return NextResponse.json(
        { error: 'Questa risorsa esiste già' },
        { status: 409 },
      )
    }

    // Record not found
    if (error.message.includes('Record to update not found') ||
        error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Risorsa non trovata' },
        { status: 404 },
      )
    }

    // Auth errors (from requireAuth/requireRole)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 },
      )
    }
    if (error.message.startsWith('Forbidden')) {
      return NextResponse.json(
        { error: 'Permessi insufficienti' },
        { status: 403 },
      )
    }

    // Database connection errors
    if (error.message.includes("Can't reach database") ||
        error.message.includes('Tenant or user not found')) {
      console.error(`[API${context ? ` ${context}` : ''}] DB connection error:`, error.message)
      return NextResponse.json(
        { error: 'Servizio temporaneamente non disponibile' },
        { status: 503 },
      )
    }
  }

  // ── Fallback: errore generico ──
  // Log completo server-side, messaggio generico al client
  console.error(`[API${context ? ` ${context}` : ''}] Unhandled error:`, error)
  return NextResponse.json(
    { error: 'Errore interno del server' },
    { status: 500 },
  )
}

// ────────────────────────────────────────────────────────────────
// HTML escaping (per prevenire XSS in template strings)
// ────────────────────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapa caratteri HTML pericolosi — usare quando si inietta testo in template HTML */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char)
}
