import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, ImagePlus, Loader2, Tag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ImageDropZone } from "../components/ImageDropZone";
import { api, ApiError } from "../lib/api";

interface PreviewNode {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width?: number;
  tone?: "input" | "copy" | "image" | "output" | "blank";
}

interface PreviewEdge {
  from: string;
  to: string;
}

interface CanvasPlanOption {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
  miniLayout: "blank" | "main" | "branched";
  previewNodes: PreviewNode[];
  previewEdges: PreviewEdge[];
}

const CANVAS_PLAN_OPTIONS: CanvasPlanOption[] = [
  {
    key: "",
    label: "空白画布",
    shortLabel: "自由编排",
    description: "只保留商品资料入口，适合从零搭建流程。",
    badge: "基础",
    miniLayout: "blank",
    previewNodes: [
      { id: "product", title: "商品资料", subtitle: "商品信息", x: 48, y: 112, tone: "input" },
      { id: "blank", title: "自由编排", subtitle: "添加节点", x: 368, y: 112, tone: "blank" },
    ],
    previewEdges: [{ from: "product", to: "blank" }],
  },
  {
    key: "ecommerce-main-image-v1",
    label: "商品主图",
    shortLabel: "突出商品主体",
    description: "生成列表首图和详情首屏主视觉，突出主体和核心卖点。",
    badge: "首图",
    miniLayout: "main",
    previewNodes: [
      { id: "product", title: "商品资料", subtitle: "商品信息", x: 48, y: 120, tone: "input" },
      { id: "copy", title: "主图文案", subtitle: "核心卖点", x: 320, y: 80, tone: "copy" },
      { id: "image", title: "生成主图", subtitle: "AI 生图", x: 640, y: 112, tone: "image" },
      { id: "output", title: "主图输出", subtitle: "结果槽位", x: 960, y: 66, tone: "output" },
      { id: "iteration_image", title: "细化生图", subtitle: "二次输出", x: 1280, y: 188, tone: "image" },
      { id: "iteration_output", title: "细化输出", subtitle: "结果槽位", x: 1600, y: 188, tone: "output" },
    ],
    previewEdges: [
      { from: "product", to: "copy" },
      { from: "product", to: "image" },
      { from: "copy", to: "image" },
      { from: "image", to: "output" },
      { from: "output", to: "iteration_image" },
      { from: "iteration_image", to: "iteration_output" },
    ],
  },
  {
    key: "ecommerce-model-lifestyle-image-v1",
    label: "模特/生活方式图",
    shortLabel: "上身与使用氛围",
    description: "适合服饰、美妆、家居等需要人物、姿态或生活方式的图片。",
    badge: "场景",
    miniLayout: "branched",
    previewNodes: [
      { id: "style", title: "风格参考", subtitle: "模特/姿态", x: 48, y: 54, tone: "output" },
      { id: "product", title: "商品资料", subtitle: "商品信息", x: 48, y: 184, tone: "input" },
      { id: "copy", title: "氛围文案", subtitle: "人群与场景", x: 348, y: 112, tone: "copy" },
      { id: "image", title: "生成图片", subtitle: "AI 生图", x: 668, y: 112, tone: "image" },
      { id: "output", title: "生活方式图输出", subtitle: "结果槽位", x: 988, y: 112, tone: "output" },
    ],
    previewEdges: [
      { from: "style", to: "copy" },
      { from: "product", to: "copy" },
      { from: "product", to: "image" },
      { from: "copy", to: "image" },
      { from: "image", to: "output" },
    ],
  },
  {
    key: "ecommerce-scene-image-v1",
    label: "使用场景图",
    shortLabel: "空间和搭配",
    description: "把商品放进空间、季节或搭配关系，解释实际使用方式。",
    badge: "空间",
    miniLayout: "branched",
    previewNodes: [
      { id: "scene", title: "场景参考", subtitle: "空间/光线", x: 48, y: 58, tone: "output" },
      { id: "product", title: "商品资料", subtitle: "商品信息", x: 48, y: 188, tone: "input" },
      { id: "copy", title: "场景文案", subtitle: "使用方式", x: 348, y: 112, tone: "copy" },
      { id: "image", title: "生成场景图", subtitle: "1536 x 1024", x: 668, y: 112, tone: "image" },
      { id: "output", title: "场景图输出", subtitle: "结果槽位", x: 988, y: 112, tone: "output" },
    ],
    previewEdges: [
      { from: "scene", to: "copy" },
      { from: "product", to: "copy" },
      { from: "product", to: "image" },
      { from: "copy", to: "image" },
      { from: "image", to: "output" },
    ],
  },
  {
    key: "ecommerce-campaign-promotion-image-v1",
    label: "活动/营销图",
    shortLabel: "促销与转化",
    description: "用于活动入口、促销位和投放素材，强调优惠信息和视觉层级。",
    badge: "营销",
    miniLayout: "branched",
    previewNodes: [
      { id: "brand", title: "活动风格参考", subtitle: "品牌色/节日", x: 48, y: 54, tone: "output" },
      { id: "product", title: "商品资料", subtitle: "商品信息", x: 48, y: 184, tone: "input" },
      { id: "copy", title: "营销文案", subtitle: "优惠与利益点", x: 348, y: 112, tone: "copy" },
      { id: "image", title: "生成活动图", subtitle: "1536 x 1024", x: 668, y: 112, tone: "image" },
      { id: "output", title: "活动图输出", subtitle: "结果槽位", x: 988, y: 112, tone: "output" },
    ],
    previewEdges: [
      { from: "brand", to: "copy" },
      { from: "product", to: "copy" },
      { from: "product", to: "image" },
      { from: "copy", to: "image" },
      { from: "image", to: "output" },
    ],
  },
];

const PREVIEW_WIDTH = 1900;
const PREVIEW_NODE_WIDTH = 248;
const NODE_HEIGHT = 74;

const toneClasses: Record<NonNullable<PreviewNode["tone"]>, string> = {
  input: "border-blue-100 bg-blue-50/80 text-blue-900",
  copy: "border-violet-100 bg-violet-50/80 text-violet-900",
  image: "border-emerald-100 bg-emerald-50/80 text-emerald-900",
  output: "border-amber-100 bg-amber-50/80 text-amber-900",
  blank: "border-dashed border-zinc-300 bg-white/70 text-zinc-500",
};

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [canvasTemplateKey, setCanvasTemplateKey] = useState<string>("");
  const [error, setError] = useState("");

  const selectedPlan =
    CANVAS_PLAN_OPTIONS.find((option) => option.key === canvasTemplateKey) ?? CANVAS_PLAN_OPTIONS[0];

  const previewLabel = useMemo(() => {
    if (!file) {
      return "点击或拖拽上传";
    }
    return file.name;
  }, [file]);

  const createProductMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error("请先上传商品图");
      }
      return api.createProduct({
        name,
        file,
        canvas_template_key: canvasTemplateKey,
      });
    },
    onSuccess: (product) => {
      navigate(`/products/${product.id}`);
    },
    onError: (mutationError) => {
      if (mutationError instanceof ApiError) {
        setError(mutationError.detail);
        return;
      }
      setError(mutationError instanceof Error ? mutationError.message : "创建商品失败");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    createProductMutation.mutate();
  };

  const handleImageFiles = (files: File[]) => {
    setFile(files[0] ?? null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-900 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-[1440px] rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Tag size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950">新建商品</h1>
              <p className="mt-1 text-sm text-zinc-500">创建商品并选择适合的内容生成模板</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/products")}
            aria-label="关闭"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[350px_minmax(0,1fr)]">
          <section className="rounded-lg border border-zinc-200 p-5">
            <h2 className="text-base font-semibold text-zinc-950">商品信息</h2>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                商品主图 <span className="text-red-500">*</span>
              </label>
              <ImageDropZone
                ariaLabel="上传商品主图"
                className="flex aspect-[1.6] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50/40 p-7 text-zinc-500 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                onFiles={handleImageFiles}
              >
                {({ isDragging }) => (
                  <>
                    <ImagePlus size={34} className="mb-3 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-700">{isDragging ? "松开以上传图片" : previewLabel}</p>
                    <p className="mt-2 text-xs text-zinc-500">支持 JPG / PNG / WebP，最大 5MB</p>
                  </>
                )}
              </ImageDropZone>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                商品名称 <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm transition-shadow placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="例如：春季新款复古碎花连衣裙"
              />
              <div className="mt-1 text-right text-xs text-zinc-400">{name.length} / 60</div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 p-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-950">选择模板</h2>
              <p className="mt-1 text-sm text-zinc-500">选择一个模板开始生成商品内容</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {CANVAS_PLAN_OPTIONS.map((option) => {
                const selected = selectedPlan.key === option.key;
                return (
                  <button
                    key={option.key || "blank"}
                    type="button"
                    onClick={() => setCanvasTemplateKey(option.key)}
                    className={`group relative min-h-[176px] rounded-lg border bg-white p-3 text-left transition-all ${
                      selected
                        ? "border-blue-600 shadow-[0_0_0_1px_rgb(37_99_235)]"
                        : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    {selected ? (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check size={15} />
                      </span>
                    ) : null}
                    <MiniCanvasPreview plan={option} selected={selected} />
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-950">{option.label}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                          {option.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{option.shortLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-lg border border-zinc-200 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">模板预览：{selectedPlan.label}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{selectedPlan.description}</p>
                </div>
                <div className="flex items-center overflow-hidden rounded-md border border-zinc-200 text-xs text-zinc-500">
                  <span className="px-3 py-1.5">-</span>
                  <span className="border-x border-zinc-200 px-3 py-1.5">100%</span>
                  <span className="px-3 py-1.5">+</span>
                </div>
              </div>
              <WorkflowPreview plan={selectedPlan} />
            </div>

            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="rounded-md border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createProductMutation.isPending}
                className="flex items-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {createProductMutation.isPending ? <Loader2 size={15} className="mr-2 animate-spin" /> : null}
                创建并继续
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

function MiniCanvasPreview({ plan, selected }: { plan: CanvasPlanOption; selected: boolean }) {
  return (
    <div
      className={`relative h-20 overflow-hidden rounded-md border ${
        selected ? "border-blue-100 bg-blue-50/30" : "border-zinc-100 bg-zinc-50"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(212_212_216)_1px,transparent_0)] bg-[length:12px_12px] opacity-50" />
      <MiniCanvasShape layout={plan.miniLayout} />
    </div>
  );
}

function MiniCanvasShape({ layout }: { layout: CanvasPlanOption["miniLayout"] }) {
  if (layout === "blank") {
    return (
      <>
        <MiniNode className="left-[14%] top-[40%] w-[24%]" />
        <MiniLine className="left-[40%] top-[52%] w-[10%]" />
        <MiniNode className="left-[52%] top-[40%] w-[24%]" />
      </>
    );
  }
  return (
    <>
      <MiniNode className="left-[8%] top-[42%] w-[20%]" />
      <MiniLine className="left-[30%] top-[54%] w-[12%]" />
      <MiniNode className="left-[44%] top-[42%] w-[20%]" />
      <MiniLine className="left-[66%] top-[54%] w-[10%]" />
      <MiniNode className="left-[78%] top-[42%] w-[16%]" />
      {layout === "branched" ? <MiniNode className="left-[8%] top-[18%] w-[20%]" /> : null}
      {layout === "branched" ? <MiniLine className="left-[28%] top-[31%] w-[18%] rotate-[25deg]" /> : null}
    </>
  );
}

function MiniNode({ className }: { className: string }) {
  return <span className={`absolute h-5 rounded border border-white bg-white shadow-sm ${className}`} />;
}

function MiniLine({ className }: { className: string }) {
  return <span className={`absolute h-px origin-left bg-blue-300 ${className}`} />;
}

function WorkflowPreview({ plan }: { plan: CanvasPlanOption }) {
  const nodeById = new Map(plan.previewNodes.map((node) => [node.id, node]));
  return (
    <div className="relative h-[270px] overflow-x-auto overflow-y-hidden rounded-md border border-zinc-100 bg-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(212_212_216)_1px,transparent_0)] bg-[length:16px_16px]" />
      <div className="relative h-[270px]" style={{ width: PREVIEW_WIDTH }}>
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${PREVIEW_WIDTH} 270`} aria-hidden="true">
          {plan.previewEdges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) {
              return null;
            }
            const fromWidth = from.width ?? PREVIEW_NODE_WIDTH;
            const startX = from.x + fromWidth;
            const startY = from.y + NODE_HEIGHT / 2;
            const endX = to.x;
            const endY = to.y + NODE_HEIGHT / 2;
            const midX = startX + Math.max((endX - startX) / 2, 28);
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {plan.previewNodes.map((node) => (
          <PreviewNodeCard key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}

function PreviewNodeCard({ node }: { node: PreviewNode }) {
  const width = node.width ?? PREVIEW_NODE_WIDTH;
  return (
    <div
      className={`absolute rounded-lg border px-3 py-3 shadow-sm backdrop-blur ${toneClasses[node.tone ?? "input"]}`}
      style={{ left: node.x, top: node.y, width, minHeight: NODE_HEIGHT }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{node.title}</div>
          <div className="mt-1 truncate text-xs opacity-70">{node.subtitle}</div>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-zinc-500">未运行</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        <span className="h-1.5 w-7 rounded-full bg-current opacity-20" />
        <span className="h-1.5 w-4 rounded-full bg-current opacity-20" />
      </div>
    </div>
  );
}
