import type { EvalTaskDefinition } from './types.d.ts'

export const EVAL_TASK_SET_VERSION: string
export const EVAL_TASKS: readonly EvalTaskDefinition[]

export function resolveEvalTasks(
  selectedIds?: readonly string[],
): readonly EvalTaskDefinition[]
