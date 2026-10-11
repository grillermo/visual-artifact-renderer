"use client"

import { useId, useState } from "react"

import type { AdapterArgs } from "@/components/artifact-types"
import { usePlanContext } from "@/components/plan/decision-answers"
import { cn } from "@/lib/utils"

export function renderDecision(args: AdapterArgs<"decision">) {
  return <DecisionCard {...args} />
}

function DecisionCard({ node }: AdapterArgs<"decision">) {
  const { id, question, mode = "single", options, allowOther } = node.props
  const plan = usePlanContext()
  const suggested = options.filter((option) => option.suggested).map((option) => option.id)
  const [localAnswer, setLocalAnswer] = useState<{ optionIds: string[]; other?: string; source: "suggested" | "reader" }>({
    optionIds: suggested,
    source: "suggested",
  })
  const answer = plan?.answers[id] ?? localAnswer
  const setAnswer = (optionIds: string[], other?: string) => {
    if (plan) plan.setAnswer(id, optionIds, other)
    else setLocalAnswer({ optionIds, other, source: "reader" })
  }
  const index = plan ? plan.decisions.findIndex((decision) => decision.askId === id) : -1
  const heading = index >= 0 ? `Decision ${index + 1} of ${plan!.decisions.length}` : "Decision"
  const name = useId()
  const questionId = `${name}-q`
  const pending = answer.source === "suggested"
  const multiple = mode === "multiple"
  const choose = (optionId: string) => {
    if (!multiple) return setAnswer([optionId], optionId === "other" ? answer.other : undefined)
    const next = answer.optionIds.includes(optionId) ? answer.optionIds.filter((x) => x !== optionId) : [...answer.optionIds, optionId]
    setAnswer(next, answer.other)
  }
  const all = allowOther ? [...options, { id: "other", label: "Other", consequence: undefined, suggested: false }] : options

  return (
    <fieldset
      className="flex min-w-0 flex-col gap-4 border-t border-rule-strong pt-5"
      data-decision={id}
      data-source={answer.source}
      aria-labelledby={questionId}
    >
      <legend className="sr-only">{question}</legend>
      <div className="flex flex-col gap-2">
        <p className={cn("font-mono text-label uppercase tracking-[0.14em]", pending ? "text-brand" : "text-ink-muted")}>{heading}</p>
        <p id={questionId} className="max-w-[40ch] font-serif text-row-title text-ink [text-wrap:balance]">
          {question}
        </p>
        {pending && <p className="text-meta text-ink-muted">Using suggestion · confirm or change</p>}
      </div>
      <div className="flex flex-col" role={multiple ? "group" : "radiogroup"} aria-labelledby={questionId}>
        {all.map((option) => {
          const checked = answer.optionIds.includes(option.id)
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-4 border-b border-rule py-4 transition-colors duration-100 ease-out hover:bg-ink/[0.03]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
              )}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={option.id}
                checked={checked}
                onChange={() => choose(option.id)}
                className="mt-1.5 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span className="min-w-0">
                <span className={cn("break-words font-serif text-row-title", checked ? "text-ink" : "text-ink")}>{option.label}</span>
                {option.suggested && (
                  <span className="ml-3 font-mono text-label uppercase tracking-[0.14em] text-brand">suggested</span>
                )}
                {option.consequence && <span className="mt-1 block break-words text-small text-ink-muted">{option.consequence}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {allowOther && answer.optionIds.includes("other") && (
        <input
          type="text"
          value={answer.other ?? ""}
          onChange={(event) => setAnswer(answer.optionIds, event.target.value)}
          placeholder="Your answer"
          aria-label={`Other answer for ${question}`}
          className="h-10 w-full border-b border-rule-strong bg-transparent px-1 text-small outline-none focus-visible:border-brand"
        />
      )}
    </fieldset>
  )
}
