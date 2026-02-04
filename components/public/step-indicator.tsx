'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold border-2 transition-colors',
                  currentStep > step.id
                    ? 'bg-primary border-primary text-white'
                    : currentStep === step.id
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-gray-300 text-gray-400 bg-white'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-sm font-medium hidden sm:block',
                  currentStep >= step.id ? 'text-primary' : 'text-gray-400'
                )}
              >
                {step.title}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-2 sm:mx-4">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors',
                    currentStep > step.id ? 'bg-primary' : 'bg-gray-200'
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
