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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#faf8f5] border border-stone-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-stone-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-widest block">
                CURRICULUM LABS & REFERENCE MODELS
              </span>
              <h2 className="text-base font-bold text-stone-900">
                Interactive Example Wirings & Learning Labs
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-6 py-2.5 bg-[#f5f1eb] border-b border-stone-200 flex items-center gap-2 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-stone-900 text-white shadow-sm font-bold'
                  : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200/80'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Lab Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLabs.map((lab) => {
            const diffColor =
              lab.difficulty === 'Beginner'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : lab.difficulty === 'Intermediate'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200';

            return (
              <div
                key={lab.id}
                onClick={() => onSelectLab(lab)}
                className="group flex flex-col justify-between p-4 rounded-xl border border-stone-200/90 bg-white hover:border-rose-300 hover:shadow-md transition cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border bg-stone-50 text-stone-700 border-stone-200">
                      {lab.badge}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor}`}>
                      {lab.difficulty}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 group-hover:text-rose-600 transition-colors mb-1">
                    {lab.title}
                  </h3>

                  <p className="text-xs text-stone-500 mb-3 leading-relaxed">
                    {lab.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <div className="text-[9px] font-bold text-stone-400 uppercase tracking-wider font-mono">
                      Learning Competencies:
                    </div>
                    {lab.objectives.slice(0, 3).map((obj, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform">
                  <span>Load Installation Model</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Blank Sandbox option */}
        <div className="px-6 py-3.5 border-t border-stone-200 bg-white flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Want to start from a completely clean, empty canvas?
          </div>
          <button
            onClick={onSelectBlank}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Blank Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
