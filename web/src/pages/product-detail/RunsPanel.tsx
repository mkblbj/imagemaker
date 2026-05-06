import { useState } from "react";
import { FileText, Loader2, OctagonX, RotateCcw, Layers3 } from "lucide-react";

import { PromptPreviewDialog, type PromptPreview } from "../../components/PromptPreviewDialog";
import { formatDateTime } from "../../lib/format";
import type { ProductWorkflow, WorkflowRun, WorkflowRunStatus } from "../../lib/types";
import { outputText } from "./utils";

const RUN_STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
  cancelled: "已取消",
};

const RUN_STATUS_CLASS_NAMES: Record<WorkflowRunStatus, string> = {
  running: "border-blue-200 bg-blue-50 text-blue-700",
  succeeded: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const RUN_STATUS_DOT_CLASS_NAMES: Record<WorkflowRunStatus, string> = {
  running: "bg-blue-500 shadow-blue-500/30",
  succeeded: "bg-emerald-500 shadow-emerald-500/30",
  failed: "bg-red-500 shadow-red-500/30",
  cancelled: "bg-zinc-400 shadow-zinc-400/30",
};

interface RunsPanelProps {
  workflow: ProductWorkflow | null;
  latestRun: ProductWorkflow["runs"][number] | null;
  busyRunId: string | null;
  onCancelRun: (run: WorkflowRun) => void;
  onRetryRun: (run: WorkflowRun) => void;
}

function workflowRunQueueText(run: WorkflowRun): string {
  if (run.queue_position) {
    return `排队第 ${run.queue_position} 位，前方 ${run.queued_ahead_count ?? 0} 个；全局活跃 ${run.queue_active_count}/${run.queue_max_concurrent_tasks}。`;
  }
  if (run.status === "running") {
    return `全局运行 ${run.queue_running_count} 个，排队 ${run.queue_queued_count} 个。`;
  }
  return "";
}

function imagePromptItems(
  workflow: ProductWorkflow,
  run: WorkflowRun,
): Array<{ nodeId: string; title: string; instruction: string }> {
  return run.node_runs.flatMap((nodeRun) => {
    const node = workflow.nodes.find((item) => item.id === nodeRun.node_id);
    if (node?.node_type !== "image_generation" || !nodeRun.output_json) {
      return [];
    }
    const instruction = outputText(nodeRun.output_json, "instruction");
    if (!instruction) {
      return [];
    }
    return [
      {
        nodeId: node.id,
        title: node.title,
        instruction,
      },
    ];
  });
}

export function RunsPanel({ workflow, latestRun, busyRunId, onCancelRun, onRetryRun }: RunsPanelProps) {
  const [promptPreview, setPromptPreview] = useState<PromptPreview | null>(null);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {workflow?.runs.length ? `共 ${workflow.runs.length} 次运行` : "暂无运行历史"}
        </div>
        {latestRun ? (
          <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-500">
            最近 {formatDateTime(latestRun.started_at)}
          </div>
        ) : null}
      </div>
      {workflow?.runs.length ? (
        <div className="space-y-2">
          {workflow.runs.map((run) => {
            const promptItems = imagePromptItems(workflow, run);
            const queueText = workflowRunQueueText(run);
            const runBusy = busyRunId === run.id;
            return (
              <div
                key={run.id}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full shadow-md ${RUN_STATUS_DOT_CLASS_NAMES[run.status]}`}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${RUN_STATUS_CLASS_NAMES[run.status]}`}
                        >
                          {RUN_STATUS_LABELS[run.status]}
                        </span>
                        <span className="inline-flex items-center text-[11px] text-zinc-500">
                          <Layers3 size={12} className="mr-1 text-zinc-400" />
                          节点记录 {run.node_runs.length}
                        </span>
                      </div>
                      {promptItems.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {promptItems.map((item) => (
                            <button
                              key={`${run.id}-${item.nodeId}`}
                              type="button"
                              onClick={() =>
                                setPromptPreview({
                                  title: `${item.title} Prompt`,
                                  text: item.instruction,
                                  meta: formatDateTime(run.started_at),
                                })
                              }
                              className="inline-flex max-w-full items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <FileText size={12} className="mr-1 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {run.failure_reason ? (
                        <div
                          className={`mt-2 line-clamp-2 rounded-lg border px-2.5 py-1.5 ${
                            run.status === "cancelled"
                              ? "border-zinc-100 bg-zinc-50 text-zinc-600"
                              : "border-red-100 bg-red-50 text-red-700"
                          }`}
                        >
                          {run.failure_reason}
                        </div>
                      ) : null}
                      {queueText ? <div className="mt-2 text-[11px] leading-5 text-zinc-500">{queueText}</div> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right text-[10px] leading-relaxed text-zinc-400">
                    <div>
                      <div>{formatDateTime(run.started_at)}</div>
                      {run.finished_at ? <div>完成 {formatDateTime(run.finished_at)}</div> : null}
                    </div>
                    {run.is_cancelable || run.is_retryable ? (
                      <div className="flex items-center gap-1.5">
                        {run.is_retryable ? (
                          <button
                            type="button"
                            onClick={() => onRetryRun(run)}
                            disabled={runBusy}
                            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                          >
                            {runBusy ? (
                              <Loader2 size={12} className="mr-1 animate-spin" />
                            ) : (
                              <RotateCcw size={12} className="mr-1" />
                            )}
                            重试
                          </button>
                        ) : null}
                        {run.is_cancelable ? (
                          <button
                            type="button"
                            onClick={() => onCancelRun(run)}
                            disabled={runBusy}
                            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-60"
                          >
                            {runBusy ? (
                              <Loader2 size={12} className="mr-1 animate-spin" />
                            ) : (
                              <OctagonX size={12} className="mr-1" />
                            )}
                            取消
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-xs text-zinc-500">
          暂无运行记录
        </div>
      )}
      {promptPreview ? (
        <PromptPreviewDialog preview={promptPreview} onClose={() => setPromptPreview(null)} />
      ) : null}
    </section>
  );
}
