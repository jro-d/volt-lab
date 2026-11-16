import React, { useState } from 'react';
import { LAB_LESSONS, LabLesson, LabCategory } from '../../data/labTemplates';
import { BookOpen, X, Check, ArrowRight, Sparkles, Filter } from 'lucide-react';

interface LabSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLab: (lesson: LabLesson) => void;
  onSelectBlank: () => void;
}

export const LabSelectorModal: React.FC<LabSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectLab,
  onSelectBlank,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<LabCategory>('all');

  if (!isOpen) return null;

  const categories: { id: LabCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Examples', count: LAB_LESSONS.length },
    { id: 'sockets', label: 'Sockets & GFCI', count: LAB_LESSONS.filter(l => l.category === 'sockets').length },
    { id: 'lighting', label: 'Lighting & Switches', count: LAB_LESSONS.filter(l => l.category === 'lighting').length },
    { id: 'industrial', label: 'Industrial Controls', count: LAB_LESSONS.filter(l => l.category === 'industrial').length },
    { id: 'automation', label: 'PLC & Automation', count: LAB_LESSONS.filter(l => l.category === 'automation').length },
    { id: 'splice', label: 'Splice Tutorials', count: LAB_LESSONS.filter(l => l.category === 'splice').length },
    { id: 'appliances', label: 'Appliances & Loads', count: LAB_LESSONS.filter(l => l.category === 'appliances').length },
    { id: 'residential', label: 'Complete System', count: LAB_LESSONS.filter(l => l.category === 'residential').length },
  ];

  const filteredLabs = selectedCategory === 'all'
    ? LAB_LESSONS
    : LAB_LESSONS.filter(l => l.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface border border-border rounded-lg shadow-2 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-ink">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-soft flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-brand-ink" />
            </div>
            <div>
              <span className="text-[11px] font-display font-semibold text-ink-muted uppercase tracking-[0.08em] block">
                CURRICULUM LABS & REFERENCE MODELS
              </span>
              <h2 className="text-base font-bold text-ink">
                Interactive Example Wirings & Learning Labs
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-sunken text-ink-muted hover:text-ink transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-6 pt-4 pb-2 bg-surface-sunken border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-ink text-surface shadow-sm font-bold'
                    : 'bg-surface hover:bg-surface-sunken text-ink-muted border border-border/80'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat.id ? 'bg-surface/20 text-ink' : 'bg-surface-sunken text-ink-muted'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lab Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLabs.map((lab) => {
            const diffColor =
              lab.difficulty === 'Beginner'
                ? 'bg-ok-soft text-ok border-ok/40'
                : lab.difficulty === 'Intermediate'
                ? 'bg-warning-soft text-warning border-warning/40'
                : 'bg-probe-soft text-probe border-probe/40';

            return (
              <div
                key={lab.id}
                onClick={() => onSelectLab(lab)}
                className="group flex flex-col justify-between p-4 rounded-md border border-border/90 bg-surface hover:border-border-strong hover:shadow-2 transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border bg-surface-sunken text-ink border-border">
                      {lab.badge}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor}`}>
                      {lab.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-ink transition-colors mb-1">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-ink-muted mb-3 leading-relaxed">
                    {lab.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider font-mono">
                      Learning Competencies:
                    </div>
                    {lab.objectives.slice(0, 3).map((obj, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-ink">
                        <Check className="w-3.5 h-3.5 text-ok shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs font-bold text-brand-ink group-hover:translate-x-1 transition-transform">
                  <span>Load Installation Model</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Blank Sandbox option */}
        <div className="px-6 py-3.5 border-t border-border bg-surface flex items-center justify-between shrink-0">
          <div className="text-xs text-ink-muted">
            Want to start from a completely clean, empty canvas?
          </div>
          <button
            onClick={onSelectBlank}
            className="flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-ink text-surface text-xs font-bold rounded-md transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-warning" />
            <span>Open Blank Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
