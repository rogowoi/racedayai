/**
 * XGBoost inference engine for TypeScript
 *
 * Implements tree traversal for XGBoost JSON models.
 * No external dependencies - pure TypeScript implementation.
 */

import type { XGBoostModel, XGBoostTree } from "./types";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Load JSON file (supports both Node.js and browser)
 */
async function loadJSON(path: string): Promise<any> {
  // Node.js environment (tsx, next server)
  if (typeof window === "undefined") {
    const basePath = process.cwd();
    const fileName = path.split("/").pop()!;
    const fullPath = join(basePath, "src", "data", "ml-models", fileName);
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // Browser environment
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load XGBoost model from JSON file
 */
export async function loadModel(modelPath: string): Promise<XGBoostModel> {
  return loadJSON(modelPath);
}

/**
 * Traverse a single decision tree (columnar format)
 */
function traverseTree(tree: XGBoostTree, features: number[], nodeIdx: number = 0): number {
  // Base case: leaf node (left and right children are -1)
  if (tree.left_children[nodeIdx] === -1) {
    return tree.base_weights[nodeIdx];
  }

  // Get split feature and threshold
  const splitFeatureIdx = tree.split_indices[nodeIdx];
  const splitThreshold = tree.split_conditions[nodeIdx];
  const featureValue = features[splitFeatureIdx];

  // Handle missing values - use default_left
  if (featureValue === null || featureValue === undefined || isNaN(featureValue)) {
    const nextNodeIdx = tree.default_left[nodeIdx] === 1
      ? tree.left_children[nodeIdx]
      : tree.right_children[nodeIdx];
    return traverseTree(tree, features, nextNodeIdx);
  }

  // Split: go left if value < threshold, else right
  const nextNodeIdx = featureValue < splitThreshold
    ? tree.left_children[nodeIdx]
    : tree.right_children[nodeIdx];

  return traverseTree(tree, features, nextNodeIdx);
}

/**
 * Predict with XGBoost model (sum of all trees + base_score)
 */
export function predictXGBoost(model: XGBoostModel, features: number[]): number {
  const trees = model.learner.gradient_booster.model.trees;

  if (!trees || trees.length === 0) {
    throw new Error("Model has no trees");
  }

  // Sum all tree predictions
  let sum = 0;
  for (const tree of trees) {
    sum += traverseTree(tree, features);
  }

  // Add base_score (starting point, usually mean of training data)
  const baseScoreStr = model.learner.learner_model_param?.base_score;
  if (baseScoreStr) {
    // Parse "[2.2852993E3]" format -> 2285.2993
    const baseScore = parseFloat(baseScoreStr.replace(/[\[\]]/g, ""));
    return sum + baseScore;
  }

  return sum;
}

/**
 * Batch prediction (multiple feature vectors)
 */
export function predictBatch(
  model: XGBoostModel,
  featuresBatch: number[][]
): number[] {
  return featuresBatch.map((features) => predictXGBoost(model, features));
}

/**
 * Load model from local data directory
 */
export async function loadModelFromData(
  modelName: string,
  distance: string
): Promise<XGBoostModel> {
  const modelPath = `/data/ml-models/${modelName}_${distance}.json`;
  return loadModel(modelPath);
}

/**
 * Preload all models for a distance
 */
export async function preloadModels(distance: string): Promise<{
  total: XGBoostModel;
  swim_sec: XGBoostModel;
  swim_pace: XGBoostModel;
  bike_sec: XGBoostModel;
  bike_watts: XGBoostModel;
  bike_np: XGBoostModel;
  run_sec: XGBoostModel;
  run_pace: XGBoostModel;
  quantiles: {
    p05: XGBoostModel;
    p25: XGBoostModel;
    p50: XGBoostModel;
    p75: XGBoostModel;
    p95: XGBoostModel;
  };
}> {
  const [
    total,
    swim_sec,
    swim_pace,
    bike_sec,
    bike_watts,
    bike_np,
    run_sec,
    run_pace,
    q05,
    q25,
    q50,
    q75,
    q95,
  ] = await Promise.all([
    loadModelFromData("total", distance),
    loadModelFromData("swim_sec", distance),
    loadModelFromData("swim_pace", distance),
    loadModelFromData("bike_sec", distance),
    loadModelFromData("bike_watts", distance),
    loadModelFromData("bike_np", distance),
    loadModelFromData("run_sec", distance),
    loadModelFromData("run_pace", distance),
    loadModelFromData("quantile_p05", distance),
    loadModelFromData("quantile_p25", distance),
    loadModelFromData("quantile_p50", distance),
    loadModelFromData("quantile_p75", distance),
    loadModelFromData("quantile_p95", distance),
  ]);

  return {
    total,
    swim_sec,
    swim_pace,
    bike_sec,
    bike_watts,
    bike_np,
    run_sec,
    run_pace,
    quantiles: { p05: q05, p25: q25, p50: q50, p75: q75, p95: q95 },
  };
}
