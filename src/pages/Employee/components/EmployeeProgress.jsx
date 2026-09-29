import { Check, Circle, FileCheck, Landmark, UserRound } from 'lucide-react';

const STEP_ICONS = {
  details: UserRound,
  kyc: FileCheck,
  accounts: Landmark,
};

const EmployeeProgress = ({ steps, activeStep, onStepChange }) => {
  const completedCount = steps.filter((step) => step.complete).length;
  const completionPercent = Math.round((completedCount / steps.length) * 100);
  const firstPendingIndex = steps.findIndex((step) => !step.complete);
  const contiguousCompletedCount = firstPendingIndex === -1 ? steps.length : firstPendingIndex;
  const trackPercent = Math.min(100, (contiguousCompletedCount / (steps.length - 1)) * 100);

  const handleKeyDown = (event, currentIndex) => {
    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = Math.min(currentIndex + 1, steps.length - 1);
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = Math.max(currentIndex - 1, 0);
    if (targetIndex !== currentIndex) {
      event.preventDefault();
      onStepChange(steps[targetIndex].id);
      event.currentTarget.parentElement.querySelectorAll('button')[targetIndex]?.focus();
    }
  };

  return (
    <section aria-label="Employee onboarding progress" className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-(--color-text-muted)">
        <span>{completedCount} of {steps.length} milestones submitted</span>
        <span>{completionPercent}% complete</span>
      </div>
      <nav aria-label="Employee submission steps" className="relative mt-4 grid grid-cols-3">
        <div
          role="progressbar"
          aria-label="Sequential onboarding progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(trackPercent)}
          className="absolute left-[16.67%] right-[16.67%] top-3 h-1 rounded-full bg-(--color-border)"
        >
          <div
            className="h-full rounded-full bg-(--color-accent) transition-all duration-300 ease-out"
            style={{ width: `${trackPercent}%` }}
          />
        </div>
        {steps.map((step, index) => {
          const StepIcon = STEP_ICONS[step.id];
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(step.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${step.label}: ${step.complete ? 'Submitted' : 'Pending'}`}
              className="relative z-10 flex min-w-0 flex-col items-center gap-1 rounded px-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 bg-(--color-bg-elevated) transition-colors ${step.complete ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-(--color-border-strong) text-(--color-text-muted)'} ${isActive ? 'ring-2 ring-(--color-accent) ring-offset-2 ring-offset-(--color-bg-elevated)' : ''}`}>
                {step.complete ? <Check size={16} aria-hidden="true" /> : StepIcon ? <StepIcon size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
              </span>
              <span className={`max-w-full truncate text-xs font-semibold ${isActive ? 'text-(--color-accent)' : 'text-(--color-text)'}`}>
                {step.label}
              </span>
              <span className={`text-[10px] ${step.complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-(--color-text-muted)'}`}>
                {step.complete ? 'Submitted' : 'Pending'}
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );
};

export default EmployeeProgress;
