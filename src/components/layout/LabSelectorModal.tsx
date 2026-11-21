import React, { useMemo, useState } from 'react';
import { LAB_LESSONS, LabLesson, LabCategory } from '../../data/labTemplates';
import { matchesSmartSearch } from '../../utils/fuzzySearch';
import { BookOpen, X, Check, ArrowRight, Sparkles, Filter, Search } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');

  const searchMatchedLabs = useMemo(() => {
    if (!searchQuery.trim()) return LAB_LESSONS;
    return LAB_LESSONS.filter((lab) =>
      matchesSmartSearch(searchQuery, [
        lab.title,
        lab.subtitle,
        lab.description,
        lab.badge,
        lab.difficulty,
        lab.category,
        ...lab.objectives,
        ...lab.project.devices.map((d) => d.name),
      ])
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const categories: { id: LabCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Examples', count: searchMatchedLabs.length },
    { id: 'sockets', label: 'Sockets & GFCI', count: searchMatchedLabs.filter(l => l.category === 'sockets').length },
    { id: 'lighting', label: 'Lighting & Switches', count: searchMatchedLabs.filter(l => l.category === 'lighting').length },
    { id: 'industrial', label: 'Industrial Controls', count: searchMatchedLabs.filter(l => l.category === 'industrial').length },
    { id: 'automation', label: 'PLC & Automation', count: searchMatchedLabs.filter(l => l.category === 'automation').length },
    { id: 'splice', label: 'Splice Tutorials', count: searchMatchedLabs.filter(l => l.category === 'splice').length },
    { id: 'appliances', label: 'Appliances & Loads', count: searchMatchedLabs.filter(l => l.category === 'appliances').length },
    { id: 'residential', label: 'Complete System', count: searchMatchedLabs.filter(l => l.category === 'residential').length },
  ];

  const filteredLabs = selectedCategory === 'all'
    ? searchMatchedLabs
    : searchMatchedLabs.filter(l => l.category === selectedCategory);

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

        {/* Search & Category Filters */}
        <div className="px-6 pt-3.5 pb-2 bg-surface-sunken border-b border-border shrink-0 space-y-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search example wirings (e.g. DOL, 1 pole, GFCI, star-delta, PLC, motor...)"
              className="w-full pl-9 pr-24 py-2 bg-surface border border-border rounded-lg text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus-visible:shadow-focus transition"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-ink-muted">
                {filteredLabs.length} / {LAB_LESSONS.length}
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 text-xs">
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
        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          {filteredLabs.length === 0 ? (
            <div className="col-span-full py-12 px-4 text-center border border-dashed border-border-strong rounded-lg bg-surface-sunken/50">
              <p className="text-sm font-semibold text-ink mb-1">
                No example wirings matched “{searchQuery.trim()}”
                {selectedCategory !== 'all' ? ' in this category' : ''}.
              </p>
              <p className="text-xs text-ink-muted mb-4">
                Try another keyword (like “motor”, “gfci”, “switch”, or “plc”) or reset filters.
              </p>
              <div className="flex items-center justify-center gap-2.5 flex-wrap">
                {selectedCategory !== 'all' && searchMatchedLabs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="px-3.5 py-1.5 rounded-md bg-brand-soft text-brand-ink border border-brand/30 text-xs font-semibold hover:bg-brand-soft/80 transition"
                  >
                    Show all {searchMatchedLabs.length} matches in All Examples
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-surface border border-border-strong text-ink text-xs font-semibold hover:bg-surface-hover transition"
                >
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            filteredLabs.map((lab) => {
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
            })
          )}
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
