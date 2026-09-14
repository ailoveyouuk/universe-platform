'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import type { QuizQuestion } from '@/types'

interface QuizBlockProps {
  questions: QuizQuestion[]
}

function SingleQuestion({ question, options, correctAnswerIndex, explanation }: QuizQuestion) {
  const [selected, setSelected] = useState<number | null>(null)
  const answered = selected !== null

  return (
    <div className="mb-6 last:mb-0">
      <p className="font-medium text-rc-dark mb-4 leading-snug">{question}</p>
      <div className="space-y-2">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => !answered && setSelected(i)}
            className={clsx(
              'quiz-option',
              answered && i === correctAnswerIndex && 'correct',
              answered && i === selected && i !== correctAnswerIndex && 'incorrect',
              answered && 'disabled',
            )}
          >
            <span className="font-semibold mr-2 text-rc-grey-light">
              {['A', 'B', 'C', 'D'][i]}.
            </span>
            {option}
          </button>
        ))}
      </div>
      {answered && (
        <div className={clsx(
          'mt-4 p-4 rounded-lg text-sm leading-relaxed',
          selected === correctAnswerIndex
            ? 'bg-rc-green-50 text-rc-green-600 border border-rc-green/20'
            : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          <p className="font-semibold mb-1">
            {selected === correctAnswerIndex ? '✓ Correct!' : '✗ Not quite.'}
          </p>
          {explanation}
        </div>
      )}
    </div>
  )
}

export function QuizBlock({ questions }: QuizBlockProps) {
  return (
    <div className="mb-8 bg-white border border-rc-border rounded-2xl shadow-card overflow-hidden">
      <div className="bg-rc-dark px-6 py-4 flex items-center gap-3">
        <span className="text-xl">🧠</span>
        <div>
          <h4 className="font-heading font-bold text-white text-sm">Check Your Understanding</h4>
          <p className="text-white/50 text-xs">{questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="p-6 divide-y divide-rc-border">
        {questions.map((q) => (
          <div key={q._id} className="py-5 first:pt-0 last:pb-0">
            <SingleQuestion {...q} />
          </div>
        ))}
      </div>
    </div>
  )
}
