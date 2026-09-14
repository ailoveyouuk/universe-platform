'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmationQuiz — Confirmation of Learning interactive quiz component
//
// Features:
//  - One question at a time with smooth transitions
//  - Immediate visual feedback (green/red) on answer selection
//  - Feedback callout with 1-2 sentence explanation
//  - Deep-link back to the relevant review section
//  - Results screen with SVG score ring, per-question breakdown
//  - Retake support
//  - Score saved to localStorage via saveQuizScore()
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { saveQuizScore } from '@/lib/progress/quizProgress'
import { useProgressContext } from '@/lib/progress/ProgressContext'
import { getSubModuleMeta }   from '@/lib/curriculum'
import type { ColQuestion } from '@/content/sm1-quiz'

// ── Option letter labels ──────────────────────────────────────────────────────
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

// ── Radial progress ring ──────────────────────────────────────────────────────
function ScoreRing({
  score,
  total,
  size = 140,
}: {
  score: number
  total: number
  size?: number
}) {
  const pct          = total > 0 ? Math.round((score / total) * 100) : 0
  const strokeWidth  = 10
  const radius       = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset       = circumference - (pct / 100) * circumference
  const passed       = pct >= 70

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={passed ? '#82BC00' : '#EF4444'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={clsx(
            'font-heading font-bold text-3xl leading-none',
            passed ? 'text-rc-green' : 'text-red-500',
          )}
        >
          {score}/{total}
        </span>
        <span className="text-xs text-rc-grey-light mt-1">{pct}%</span>
      </div>
    </div>
  )
}

// ── Results Screen ────────────────────────────────────────────────────────────
function ResultsScreen({
  questions,
  answers,
  onRetake,
  subModuleSlug,
  moduleId,
}: {
  questions:     ColQuestion[]
  answers:       (number | null)[]
  onRetake:      () => void
  subModuleSlug: string
  moduleId:      string
}) {
  const score   = answers.filter((a, i) => a === questions[i].correctIndex).length
  const total   = questions.length
  const pct     = Math.round((score / total) * 100)
  const passed  = pct >= 70

  const grade = pct === 100
    ? { label: 'Perfect Score!', emoji: '🏆', color: 'text-rc-green' }
    : pct >= 90
    ? { label: 'Excellent!',    emoji: '⭐', color: 'text-rc-green' }
    : pct >= 70
    ? { label: 'Well Done!',    emoji: '✓',  color: 'text-rc-green' }
    : pct >= 50
    ? { label: 'Good Effort',   emoji: '📖', color: 'text-amber-600' }
    : { label: 'Keep Studying', emoji: '💪', color: 'text-red-500'   }

  // Gather any incorrect questions for the review list
  const incorrectQs = questions.filter((_, i) => answers[i] !== questions[i].correctIndex)

  return (
    <div className="animate-fade-in space-y-8">

      {/* Score hero */}
      <div className="flex flex-col items-center gap-4 py-6">
        <ScoreRing score={score} total={total} />
        <div className="text-center">
          <p className={clsx('font-heading font-bold text-2xl', grade.color)}>
            {grade.emoji} {grade.label}
          </p>
          <p className="text-rc-grey text-sm mt-1">
            {passed
              ? 'You have passed this Confirmation of Learning assessment.'
              : 'You need 70% or above to pass — review the sections below and try again.'}
          </p>
        </div>

        {/* Pass/fail badge */}
        <span className={clsx(
          'px-4 py-1.5 rounded-full text-sm font-semibold border',
          passed
            ? 'bg-rc-green-50 text-rc-green border-rc-green/30'
            : 'bg-red-50 text-red-600 border-red-200',
        )}>
          {passed ? '✓ PASS' : '✗ NOT YET PASSED'}
        </span>
      </div>

      {/* Per-question result dots */}
      <div>
        <p className="text-xs font-semibold text-rc-grey-light uppercase tracking-widest mb-3">
          Question Breakdown
        </p>
        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const correct = answers[i] === q.correctIndex
            return (
              <div
                key={q.id}
                title={`Q${i + 1}: ${correct ? 'Correct' : 'Incorrect'}`}
                className={clsx(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold',
                  correct
                    ? 'bg-rc-green-50 border-rc-green/30 text-rc-green'
                    : 'bg-red-50 border-red-200 text-red-600',
                )}
              >
                <span>{correct ? '✓' : '✗'}</span>
                <span>Q{i + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Review incorrect answers */}
      {incorrectQs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-rc-grey-light uppercase tracking-widest mb-3">
            Review These Sections
          </p>
          <div className="space-y-2">
            {incorrectQs.map((q) => (
              <Link
                key={q.id}
                href={`/learn/${moduleId}/${subModuleSlug}?section=${q.reviewSectionId}`}
                className={clsx(
                  'flex items-center justify-between gap-3 px-4 py-3 rounded-xl',
                  'bg-amber-50 border border-amber-200 hover:border-amber-400',
                  'transition-colors duration-200 group',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-amber-600 flex-shrink-0">📖</span>
                  <span className="text-sm text-amber-800 font-medium truncate">
                    {q.reviewSectionTitle}
                  </span>
                </div>
                <span className="text-amber-500 group-hover:text-amber-700 flex-shrink-0 text-sm">
                  Review →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onRetake}
          className={clsx(
            'flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200',
            'border-rc-border text-rc-grey hover:border-rc-green hover:text-rc-green',
          )}
        >
          ↺ Retake Quiz
        </button>
        <Link
          href="/dashboard"
          className={clsx(
            'flex-1 py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200',
            'bg-rc-green text-white hover:bg-rc-green-600',
          )}
        >
          Back to Dashboard →
        </Link>
      </div>
    </div>
  )
}

// ── Single Question View ──────────────────────────────────────────────────────
function QuestionView({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  moduleId,
  subModuleSlug,
}: {
  question:       ColQuestion
  questionNumber: number
  totalQuestions: number
  onAnswer:       (selectedIndex: number) => void
  moduleId:       string
  subModuleSlug:  string
}) {
  const [selected, setSelected]   = useState<number | null>(null)
  const [revealed, setRevealed]   = useState(false)
  const answered = selected !== null

  const handleSelect = (i: number) => {
    if (answered) return
    setSelected(i)
    // Brief delay before revealing explanation so the colour flash registers
    setTimeout(() => setRevealed(true), 400)
  }

  const isCorrect    = selected === question.correctIndex
  const progressPct  = ((questionNumber - 1) / totalQuestions) * 100

  // Per-option style
  function optionStyle(i: number): string {
    if (!answered) {
      return 'bg-white border-rc-border text-rc-dark hover:border-rc-green hover:bg-rc-green-50 hover:shadow-sm cursor-pointer'
    }
    if (i === question.correctIndex) {
      return 'bg-rc-green-50 border-rc-green text-rc-dark font-medium cursor-default'
    }
    if (i === selected) {
      return 'bg-red-50 border-red-400 text-red-700 cursor-default'
    }
    return 'bg-white border-rc-border text-rc-grey-light cursor-default opacity-60'
  }

  return (
    <div className="space-y-6">

      {/* Progress bar + counter */}
      <div>
        <div className="flex justify-between items-center mb-2 text-xs text-rc-grey-light">
          <span className="font-semibold text-rc-dark">Question {questionNumber} of {totalQuestions}</span>
          <span>{Math.round((questionNumber / totalQuestions) * 100)}% through</span>
        </div>
        <div className="h-1.5 bg-rc-bg-main rounded-full overflow-hidden">
          <div
            className="h-full bg-rc-green rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-rc-dark rounded-2xl px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-lg bg-rc-green flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0 mt-0.5">
            {questionNumber}
          </span>
          <p className="text-white font-medium leading-relaxed text-base">
            {question.question}
          </p>
        </div>
      </div>

      {/* Options grid — 2 col for 4 options, adapts for more */}
      <div className={clsx(
        'grid gap-3',
        question.options.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
      )}>
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={answered}
            className={clsx(
              'w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200',
              'flex items-start gap-3 group',
              optionStyle(i),
            )}
          >
            {/* Letter badge */}
            <span className={clsx(
              'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors duration-200',
              !answered
                ? 'bg-rc-bg-main text-rc-grey group-hover:bg-rc-green group-hover:text-white'
                : i === question.correctIndex
                ? 'bg-rc-green text-white'
                : i === selected
                ? 'bg-red-400 text-white'
                : 'bg-rc-bg-main text-rc-grey-light',
            )}>
              {OPTION_LABELS[i]}
            </span>

            <span className="text-sm leading-snug mt-0.5">{option}</span>

            {/* Icon after answering */}
            {answered && i === question.correctIndex && (
              <span className="ml-auto text-rc-green flex-shrink-0 font-bold">✓</span>
            )}
            {answered && i === selected && i !== question.correctIndex && (
              <span className="ml-auto text-red-500 flex-shrink-0 font-bold">✗</span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation callout — appears after answer with slide-in */}
      {revealed && (
        <div className={clsx(
          'rounded-2xl border-l-4 p-5 animate-fade-in',
          isCorrect
            ? 'bg-rc-green-50 border-rc-green'
            : 'bg-red-50 border-red-400',
        )}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 mt-0.5">
              {isCorrect ? '✅' : '❌'}
            </span>
            <div className="flex-1 min-w-0">
              <p className={clsx(
                'font-heading font-bold text-sm mb-1',
                isCorrect ? 'text-rc-green' : 'text-red-700',
              )}>
                {isCorrect ? 'Correct!' : 'Not quite.'}
              </p>
              <p className={clsx(
                'text-sm leading-relaxed',
                isCorrect ? 'text-rc-grey' : 'text-red-700',
              )}>
                {isCorrect ? question.explanation : (question.wrongExplanation ?? question.explanation)}
              </p>

              {/* Review section link */}
              <Link
                href={`/learn/${moduleId}/${subModuleSlug}?section=${question.reviewSectionId}`}
                className={clsx(
                  'inline-flex items-center gap-1.5 mt-3 text-xs font-semibold',
                  'underline underline-offset-2 hover:no-underline transition-colors',
                  isCorrect ? 'text-rc-green hover:text-rc-green-600' : 'text-red-600 hover:text-red-800',
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <span>📖</span>
                <span>Review &quot;{question.reviewSectionTitle}&quot;</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Next button — only shown after explanation appears */}
      {revealed && (
        <div className="flex justify-end animate-fade-in">
          <button
            onClick={() => onAnswer(selected!)}
            className={clsx(
              'px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200',
              'bg-rc-dark hover:bg-rc-green',
              'flex items-center gap-2',
            )}
          >
            {questionNumber < totalQuestions ? (
              <>Next Question <span>→</span></>
            ) : (
              <>View Results <span>✓</span></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ConfirmationQuiz component ───────────────────────────────────────────

interface ConfirmationQuizProps {
  questions:     ColQuestion[]
  subModuleSlug: string
  moduleId:      string
}

export function ConfirmationQuiz({
  questions,
  subModuleSlug,
  moduleId,
}: ConfirmationQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers,      setAnswers]      = useState<(number | null)[]>(
    Array(questions.length).fill(null),
  )
  const [showResults,  setShowResults]  = useState(false)
  const [savedScore,   setSavedScore]   = useState(false)

  const { handleCOLComplete } = useProgressContext()

  const handleAnswer = useCallback((selectedIndex: number) => {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIndex] = selectedIndex
      return next
    })

    if (currentIndex < questions.length - 1) {
      // Small delay before sliding to next question
      setTimeout(() => setCurrentIndex(i => i + 1), 100)
    } else {
      setTimeout(() => setShowResults(true), 100)
    }
  }, [currentIndex, questions.length])

  // Save score once results are shown
  useEffect(() => {
    if (showResults && !savedScore) {
      const score = answers.filter(
        (a, i) => a === questions[i].correctIndex,
      ).length
      saveQuizScore(subModuleSlug, score, questions.length, answers as number[])
      const smMeta = getSubModuleMeta(subModuleSlug)
      if (smMeta) handleCOLComplete(smMeta.id, score, questions.length)
      setSavedScore(true)
    }
  }, [showResults, savedScore, answers, questions, subModuleSlug, handleCOLComplete])

  const handleRetake = () => {
    setCurrentIndex(0)
    setAnswers(Array(questions.length).fill(null))
    setShowResults(false)
    setSavedScore(false)
  }

  return (
    <div className="mb-10">
      {/* Header card */}
      <div className="bg-rc-dark rounded-t-2xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h4 className="font-heading font-bold text-white text-base leading-tight">
              Confirmation of Learning
            </h4>
            <p className="text-white/50 text-xs mt-0.5">
              {questions.length} questions &middot; Pass mark: 70%
            </p>
          </div>
        </div>
        {showResults && (
          <span className={clsx(
            'text-xs font-semibold px-3 py-1 rounded-full',
            answers.filter((a, i) => a === questions[i].correctIndex).length / questions.length >= 0.7
              ? 'bg-rc-green/20 text-rc-green border border-rc-green/30'
              : 'bg-red-500/20 text-red-300 border border-red-500/30',
          )}>
            {answers.filter((a, i) => a === questions[i].correctIndex).length}/{questions.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="bg-white border-x border-b border-rc-border rounded-b-2xl shadow-card p-6">
        {showResults ? (
          <ResultsScreen
            questions={questions}
            answers={answers}
            onRetake={handleRetake}
            subModuleSlug={subModuleSlug}
            moduleId={moduleId}
          />
        ) : (
          <QuestionView
            key={currentIndex}
            question={questions[currentIndex]}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
            moduleId={moduleId}
            subModuleSlug={subModuleSlug}
          />
        )}
      </div>
    </div>
  )
}
