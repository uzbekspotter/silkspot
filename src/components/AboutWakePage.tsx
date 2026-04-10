import { motion } from 'motion/react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import wakeTurbulenceMd from '../../docs/wake_turbulence.md?raw';
import type { Page } from '../types';

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight mt-8 first:mt-0 mb-4" style={{ color: '#0f172a' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-headline text-xl font-bold mt-10 mb-3 pt-2 border-t" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: '#0f172a' }}>
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="text-sm leading-relaxed mb-3" style={{ color: '#475569' }}>{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-4 text-sm" style={{ color: '#475569' }}>{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-4 text-sm" style={{ color: '#475569' }}>{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong style={{ color: '#0f172a' }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: '#64748b' }}>{children}</em>,
  hr: () => <hr className="my-8" style={{ borderColor: '#e2e8f0' }} />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: '#e2e8f0' }}>
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: '#f8fafc' }}>{children}</thead>,
  th: ({ children }) => (
    <th className="text-left font-semibold px-3 py-2 border-b" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top border-b" style={{ color: '#475569', borderColor: '#f1f5f9' }}>
      {children}
    </td>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
};

export const AboutWakePage = ({ onNavigate }: { onNavigate: (page: Page) => void }) => (
  <div style={{ background: 'transparent', minHeight: '100vh' }} className="page-shell relative z-10">
    <div className="site-w pt-3 sm:pt-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl mx-auto"
      >
        <button
          type="button"
          onClick={() => onNavigate('about')}
          className="flex items-center gap-2 text-xs font-medium mb-4 transition-colors"
          style={{ color: '#94a3b8' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to About
        </button>

        <div className="flex items-start gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
          >
            <BookOpen className="w-5 h-5" style={{ color: '#475569' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: '#cbd5e1' }}>
              About · Reference
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#f8fafc' }}>
              Aircraft types &amp; wake turbulence
            </h1>
            <p className="text-sm mt-2" style={{ color: '#94a3b8' }}>
              Excerpt from ICAO Doc 8643 (wake categories, groups, and the three-character type description).
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 sm:p-8 card" style={{ borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.1)' }}>
          <article className="wake-md">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {wakeTurbulenceMd}
            </ReactMarkdown>
          </article>
        </div>
      </motion.div>
    </div>
  </div>
);
