import { motion } from 'motion/react';
import { ArrowLeft, Scale, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import termsMd from '../../docs/terms_of_service.md?raw';
import privacyMd from '../../docs/privacy_policy.md?raw';

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
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline font-medium"
      style={{ color: '#0ea5e9' }}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
};

export const LegalDocPage = ({
  variant,
  onBack,
}: {
  variant: 'terms' | 'privacy';
  onBack: () => void;
}) => {
  const source = variant === 'terms' ? termsMd : privacyMd;
  const title = variant === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  const subtitle = variant === 'terms' ? 'Legal · SILKSPOT' : 'Privacy · SILKSPOT';
  const Icon = variant === 'terms' ? Scale : Shield;

  return (
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
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-medium mb-4 transition-colors"
            style={{ color: '#94a3b8' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-start gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
            >
              <Icon className="w-5 h-5" style={{ color: '#475569' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: '#cbd5e1' }}>
                {subtitle}
              </p>
              <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#0f172a' }}>
                {title}
              </h1>
            </div>
          </div>

          <div
            className="rounded-xl border px-5 py-6 sm:px-8 sm:py-8"
            style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#e2e8f0', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {source}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
