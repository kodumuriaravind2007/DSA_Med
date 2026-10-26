import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, Activity, UserCheck, Stethoscope } from 'lucide-react';

interface PriorityBadgeProps {
  priority: number;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (priority === 1) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/30 ${sizeClasses}`}>
        {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-[#7F011F] animate-pulse" />}
        <span>Priority 1 — Critical</span>
      </span>
    );
  } else if (priority === 2) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
        {showIcon && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
        <span>Priority 2 — Urgent</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-[#FAF6EC] text-[#6E5A5E] border border-[#E8DBC0] ${sizeClasses}`}>
      {showIcon && <Clock className="w-3.5 h-3.5 text-[#8C7B7E]" />}
      <span>Priority 3 — Normal</span>
    </span>
  );
};

interface WorkflowBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const WorkflowBadge: React.FC<WorkflowBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm';

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    'Waiting': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    'In Treatment': {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <Activity className="w-3.5 h-3.5 text-purple-600" />,
    },
    'Lab Requested': {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      icon: <Stethoscope className="w-3.5 h-3.5 text-teal-600" />,
    },
    'Observation': {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
    },
    'Completed': {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    'Referred': {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: <UserCheck className="w-3.5 h-3.5 text-slate-600" />,
    },
    'Discharged': {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />,
    },
  };

  const config = statusConfig[status] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} shadow-2xs`}>
      {config.icon}
      <span>{status}</span>
    </span>
  );
};

interface BedBadgeProps {
  status: string;
}

export const BedBadge: React.FC<BedBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Available':
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">Available</span>;
    case 'Occupied':
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/30 shadow-2xs">Occupied</span>;
    case 'Cleaning':
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">Cleaning</span>;
    case 'Reserved':
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">Reserved</span>;
    default:
      return <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 shadow-2xs">{status}</span>;
  }
};
