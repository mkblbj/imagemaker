import { describe, expect, it } from "vitest";

import type { WorkflowEdge, WorkflowNode } from "../../lib/types";
import {
  createRestoreNodesStep,
  getInternalWorkflowEdges,
  workflowHistoryStepRequiresConfirmation,
} from "./workflowHistory";

const baseNode = (id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
  id,
  workflow_id: "workflow",
  node_type: "copy_generation",
  title: id,
  position_x: 120,
  position_y: 160,
  config_json: { instruction: "keep" },
  status: "succeeded",
  output_json: { copy_set_id: "copy-1" },
  failure_reason: "old failure",
  last_run_at: "2026-05-14T01:02:03Z",
  created_at: "2026-05-14T01:02:03Z",
  updated_at: "2026-05-14T01:02:03Z",
  ...overrides,
});

const baseEdge = (id: string, source: string, target: string): WorkflowEdge => ({
  id,
  workflow_id: "workflow",
  source_node_id: source,
  target_node_id: target,
  source_handle: "output",
  target_handle: "input",
  created_at: "2026-05-14T01:02:03Z",
});

describe("workflow history helpers", () => {
  it("only asks for confirmation when executing a history step would delete nodes or edges", () => {
    expect(workflowHistoryStepRequiresConfirmation({ kind: "deleteNodes", nodeIds: ["a"] })).toBe(true);
    expect(workflowHistoryStepRequiresConfirmation({ kind: "deleteEdges", edgeIds: ["edge-1"] })).toBe(true);
    expect(workflowHistoryStepRequiresConfirmation({ kind: "restoreNodes", nodes: [], edges: [] })).toBe(false);
    expect(workflowHistoryStepRequiresConfirmation({ kind: "restoreEdges", edges: [] })).toBe(false);
    expect(workflowHistoryStepRequiresConfirmation({ kind: "moveNodes", moves: [] })).toBe(false);
  });

  it("keeps only edges internal to the selected nodes when restoring a deletion", () => {
    const edges = [
      baseEdge("internal", "a", "b"),
      baseEdge("incoming", "outside", "a"),
      baseEdge("outgoing", "b", "outside"),
    ];

    expect(getInternalWorkflowEdges(edges, new Set(["a", "b"])).map((edge) => edge.id)).toEqual(["internal"]);
  });

  it("stores deleted node structure without output, run state, or generated artifacts", () => {
    const step = createRestoreNodesStep(
      [
        baseNode("a", {
          config_json: {
            instruction: "keep",
            copy_set_id: "copy-1",
            nested: { poster_variant_id: "poster-1", keep: "value" },
          },
        }),
        baseNode("b", {
          node_type: "image_generation",
          config_json: {
            instruction: "keep",
            generated_poster_variant_ids: ["poster-1"],
            filled_source_asset_ids: ["asset-1"],
            preview_url: "/api/asset",
          },
        }),
      ],
      [baseEdge("internal", "a", "b")],
    );

    expect(step).toEqual({
      kind: "restoreNodes",
      nodes: [
        {
          oldId: "a",
          node_type: "copy_generation",
          title: "a",
          position_x: 120,
          position_y: 160,
          config_json: { instruction: "keep", nested: { keep: "value" } },
        },
        {
          oldId: "b",
          node_type: "image_generation",
          title: "b",
          position_x: 120,
          position_y: 160,
          config_json: { instruction: "keep" },
        },
      ],
      edges: [
        {
          oldId: "internal",
          source_node_id: "a",
          target_node_id: "b",
          source_handle: "output",
          target_handle: "input",
        },
      ],
    });
  });
});
