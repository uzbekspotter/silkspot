import { motion } from 'motion/react';
import { MessageSquare, Users, Globe2 } from 'lucide-react';
import React from 'react';

export const CommunityPage = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'transparent', minHeight: '100vh' }} className="relative z-10">

      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-10">
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Community</div>
          <h1 className="font-headline text-4xl font-bold tracking-tight" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>Forums</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Discuss aviation, share sightings and get help from the community.</p>
        </div>
      </section>

      <div className="site-w py-20">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <MessageSquare className="w-10 h-10" style={{ color: '#94a3b8' }} />
          </div>
          <h2 className="font-headline text-2xl font-bold mb-3 tracking-tight" style={{ color: '#0f172a' }}>Coming Soon</h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#475569' }}>
            We're building a place for spotters to discuss aviation, share reports, help with aircraft identification, and connect with each other.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, label: 'Discussions', desc: 'Aviation topics' },
              { icon: Users, label: 'ID Help', desc: 'Aircraft identification' },
              { icon: Globe2, label: 'Reports', desc: 'Spotting locations' },
            ].map(f => { const Icon = f.icon; return (
              <div key={f.label} className="card p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: '#94a3b8' }} />
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#0f172a' }}>{f.label}</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{f.desc}</div>
              </div>
            ); })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
