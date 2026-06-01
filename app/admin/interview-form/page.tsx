'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import '@/styles/adore-v3.css'

// 面接フォーム（公開の8ステップ応募フォーム /interview）の入口 URL。
// 環境変数で上書き可能。未設定時は本番 URL にフォールバック（ハードコード一点物にしない）。
const FORM_URL =
  process.env.NEXT_PUBLIC_INTERVIEW_FORM_URL ??
  'https://adore-system-psja.vercel.app/interview'

function CopyIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

export default function InterviewFormGuidePage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FORM_URL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボード API が使えない環境向けフォールバック
      const ok = window.prompt('以下の URL をコピーしてください', FORM_URL)
      void ok
    }
  }

  return (
    <div className="adore-v3 -mt-6 -mx-4 -mb-20 md:-mt-8 md:-mx-8 md:-mb-8 min-h-screen">
      <div className="mx-auto max-w-3xl px-5 pt-8 pb-24 md:px-10 md:pt-10 md:pb-16">
        {/* 見出し */}
        <div className="page-head">
          <Link href="/admin" className="crumb">
            ← DASHBOARD
          </Link>
          <h1 className="ptitle">面接フォーム案内</h1>
          <p className="pmeta">
            面接にお越しの方に、その場で QR を読み取って応募フォームへご案内します
          </p>
        </div>

        {/* QR カード */}
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--hair)',
            borderRadius: 4,
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {/* 上部 brass ヘアライン */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--brass), var(--brass-soft) 60%, transparent)' }} />

          <div className="md:flex md:items-stretch">
            {/* QR 本体 */}
            <div
              className="flex flex-col items-center justify-center px-6 py-10 md:px-10"
              style={{ background: 'var(--cream)', borderBottom: '1px solid var(--hair)' }}
            >
              <div className="eyebrow" style={{ marginBottom: 18 }}>
                SCAN&nbsp;TO&nbsp;ENTRY
              </div>
              <div
                style={{
                  background: '#ffffff',
                  padding: 18,
                  borderRadius: 6,
                  border: '1px solid var(--hair)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <QRCodeSVG
                  value={FORM_URL}
                  size={232}
                  level="M"
                  marginSize={0}
                  bgColor="#ffffff"
                  fgColor="#1a1614"
                />
              </div>
              <p
                className="num"
                style={{ marginTop: 16, fontSize: 13, letterSpacing: '0.06em', color: 'var(--ink-50)' }}
              >
                応募フォーム（全8ステップ）
              </p>
            </div>

            {/* 案内・URL・操作 */}
            <div className="px-6 py-8 md:px-10 md:py-10 md:flex-1 md:flex md:flex-col md:justify-center">
              <h2
                style={{
                  fontFamily: 'var(--serif-jp)',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  margin: '0 0 12px',
                  color: 'var(--charcoal)',
                }}
              >
                その場でスマホからご入力いただけます
              </h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.9, color: 'var(--ink-70)', margin: '0 0 24px' }}>
                面接にお越しの方に、この QR コードを読み取っていただき、
                その場で応募フォームにご入力ください。事前の URL 送付は不要です。
              </p>

              {/* URL テキスト + コピー */}
              <label
                className="eyebrow"
                style={{ display: 'block', marginBottom: 8, color: 'var(--brass-deep)' }}
              >
                FORM URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'var(--serif-lt)',
                    fontSize: 14,
                    letterSpacing: '0.02em',
                    color: 'var(--charcoal)',
                    background: 'var(--cream-2)',
                    border: '1px solid var(--hair)',
                    borderRadius: 3,
                    padding: '10px 12px',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {FORM_URL}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
                  aria-label="フォーム URL をコピー"
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'コピーしました' : 'URL をコピー'}
                </button>
              </div>

              {/* 直接開く導線（任意） */}
              <div style={{ marginTop: 18 }}>
                <a
                  href={FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-detail"
                >
                  フォームを別タブで開く →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 補足ガイド */}
        <p className="pmeta" style={{ marginTop: 20, maxWidth: 560 }}>
          ※ 表示先 URL は環境変数 <code style={{ fontFamily: 'var(--serif-lt)' }}>NEXT_PUBLIC_INTERVIEW_FORM_URL</code> で
          変更できます（未設定時は本番フォームを表示）。
        </p>
      </div>
    </div>
  )
}
