#!/usr/bin/env python3
"""Generate 06_ensemble.ipynb — per-distance ensemble & stacking."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 06 — Ensemble & Stacking (Per-Distance)
**RaceDayAI ML Prediction Engine (Plan 07)**

Per-distance meta-learners that combine supervised (NB03), Bayesian (NB04), and neural (NB05)
predictions. Adaptive weighting by data-richness tier. Calibration checks.

**Reads:** `model_predictions_{dist}.csv`, `bayesian_predictions_{dist}.csv`,
`neural_predictions_{dist}.csv`, `athlete_profile.csv`
**Writes:** `ensemble_predictions_70.3.csv`, `ensemble_predictions_140.6.csv`,
`ensemble_evaluation.csv`"""),

code("""import pandas as pd
import numpy as np
import warnings
from pathlib import Path
from time import time
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
import lightgbm as lgb
warnings.filterwarnings('ignore')

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'

MODEL_DISTANCES = ['70.3', '140.6']"""),

md("## 1. Load All Model Predictions (Per Distance)"),

code("""dist_data = {}

for DIST in MODEL_DISTANCES:
    print(f"\\n--- Loading {DIST} ---")
    data = {}

    # Supervised predictions (from NB03)
    try:
        sup = pd.read_csv(CLEANED / f'model_predictions_{DIST}.csv', low_memory=False)
        data['sup'] = sup
        print(f"  Supervised: {len(sup):,}")
    except FileNotFoundError:
        print(f"  ⚠ model_predictions_{DIST}.csv not found")
        continue

    # Bayesian predictions (from NB04)
    try:
        bayes = pd.read_csv(CLEANED / f'bayesian_predictions_{DIST}.csv', low_memory=False)
        data['bayes'] = bayes
        print(f"  Bayesian: {len(bayes):,}")
    except FileNotFoundError:
        print(f"  ⚠ bayesian_predictions_{DIST}.csv not found — will skip Bayesian features")

    # Neural predictions (from NB05)
    try:
        neural = pd.read_csv(CLEANED / f'neural_predictions_{DIST}.csv', low_memory=False)
        data['neural'] = neural
        print(f"  Neural: {len(neural):,}")
    except FileNotFoundError:
        # Fallback: try combined file
        try:
            neural_all = pd.read_csv(CLEANED / 'neural_predictions.csv', low_memory=False)
            neural = neural_all[neural_all['event_distance'] == DIST].copy()
            data['neural'] = neural
            print(f"  Neural (from combined): {len(neural):,}")
        except FileNotFoundError:
            print(f"  ⚠ neural_predictions not found — will skip Neural features")

    dist_data[DIST] = data

# Athlete profiles for data-richness features
profiles = pd.read_csv(CLEANED / 'athlete_profile.csv',
                        usecols=['athlete_hash', 'total_races', 'consistency_cv'],
                        low_memory=False)
print(f"\\nProfiles: {len(profiles):,}")"""),

md("## 2. Build Meta-Feature Matrix (Per Distance)"),

code("""meta_dfs = {}

for DIST in MODEL_DISTANCES:
    if DIST not in dist_data or 'sup' not in dist_data[DIST]:
        continue
    print(f"\\n{'='*70}")
    print(f"  META-FEATURES: {DIST}")
    print(f"{'='*70}")

    data = dist_data[DIST]
    meta = data['sup'].copy()

    # Merge Bayesian
    if 'bayes' in data:
        b = data['bayes'][['athlete_hash', 'event_year', 'bayes_pred', 'bayes_std']].copy()
        # Deduplicate if needed
        b = b.drop_duplicates(subset=['athlete_hash', 'event_year'])
        if 'event_year' in meta.columns and 'event_year' in b.columns:
            meta = meta.merge(b, on=['athlete_hash', 'event_year'], how='left')
        else:
            meta = meta.merge(b, on='athlete_hash', how='left')
        print(f"  + Bayesian: {meta['bayes_pred'].notna().sum():,} matched")

    # Merge Neural
    if 'neural' in data:
        n = data['neural'][['athlete_hash', 'neural_pred']].drop_duplicates(subset='athlete_hash')
        meta = meta.merge(n, on='athlete_hash', how='left')
        print(f"  + Neural: {meta['neural_pred'].notna().sum():,} matched")

    # Merge profile features
    meta = meta.merge(profiles, on='athlete_hash', how='left')

    # Compute IQR from quantile columns if present
    if 'q25' in meta.columns and 'q75' in meta.columns:
        meta['quantile_iqr'] = meta['q75'] - meta['q25']

    # Data richness
    meta['n_prior_races'] = meta['total_races'].fillna(0)
    meta['input_confidence'] = pd.cut(meta['n_prior_races'],
                                       bins=[-1, 0, 2, 5, 100],
                                       labels=[0, 1, 2, 3]).astype(float)

    meta_dfs[DIST] = meta
    print(f"  Meta-feature matrix: {len(meta):,} rows")
    print(f"  Columns: {list(meta.columns)}")"""),

md("""## 3. Define Meta-Features (Per Distance)

The stacking meta-model sees individual model predictions as features, plus data-richness signals."""),

code("""meta_features_by_dist = {}

for DIST in MODEL_DISTANCES:
    if DIST not in meta_dfs:
        continue
    meta = meta_dfs[DIST]

    pred_cols = []
    # Supervised model predictions
    for col in ['pred_xgb', 'pred_lgb', 'pred_cat', 'pred_rf', 'pred_ridge',
                'pred_xgb_tuned', 'pred_chained']:
        if col in meta.columns and meta[col].notna().sum() > 100:
            pred_cols.append(col)

    # Bayesian
    if 'bayes_pred' in meta.columns and meta['bayes_pred'].notna().sum() > 100:
        pred_cols.append('bayes_pred')
    if 'bayes_std' in meta.columns and meta['bayes_std'].notna().sum() > 100:
        pred_cols.append('bayes_std')

    # Neural
    if 'neural_pred' in meta.columns and meta['neural_pred'].notna().sum() > 100:
        pred_cols.append('neural_pred')

    # Quantile features
    if 'q50' in meta.columns:
        pred_cols.append('q50')
    if 'quantile_iqr' in meta.columns:
        pred_cols.append('quantile_iqr')

    # Data richness
    pred_cols.extend(['n_prior_races', 'input_confidence'])

    # Fill NaN
    for col in pred_cols:
        if meta[col].isna().any():
            meta[col] = meta[col].fillna(meta[col].median())

    meta_features_by_dist[DIST] = pred_cols
    print(f"\\n{DIST} meta-features ({len(pred_cols)}):")
    for col in pred_cols:
        print(f"  {col}: mean={meta[col].mean():.1f}  std={meta[col].std():.1f}")"""),

md("## 4. Train Meta-Learners (Per Distance)"),

code("""ensemble_results = {}
best_models = {}

for DIST in MODEL_DISTANCES:
    if DIST not in meta_dfs or DIST not in meta_features_by_dist:
        continue
    print(f"\\n{'='*70}")
    print(f"  META-LEARNER: {DIST}")
    print(f"{'='*70}")

    meta = meta_dfs[DIST]
    META_FEATURES = meta_features_by_dist[DIST]

    # Random split for meta-learner (grouped by athlete)
    meta_athletes = meta['athlete_hash'].unique()
    rng = np.random.RandomState(42)
    rng.shuffle(meta_athletes)
    split_idx = len(meta_athletes) // 2
    train_ath = set(meta_athletes[:split_idx])
    meta_train = meta[meta['athlete_hash'].isin(train_ath)]
    meta_test = meta[~meta['athlete_hash'].isin(train_ath)]

    X_meta_train = meta_train[META_FEATURES].values
    y_meta_train = meta_train['total_sec'].values
    X_meta_test = meta_test[META_FEATURES].values
    y_meta_test = meta_test['total_sec'].values

    print(f"  Meta-train: {len(meta_train):,} | Meta-test: {len(meta_test):,}")

    # Ridge meta-learner
    scaler_meta = StandardScaler()
    X_mt_sc = scaler_meta.fit_transform(X_meta_train)
    X_mtest_sc = scaler_meta.transform(X_meta_test)

    ridge_meta = Ridge(alpha=1.0)
    ridge_meta.fit(X_mt_sc, y_meta_train)
    pred_ridge_meta = ridge_meta.predict(X_mtest_sc)
    mae_ridge = mean_absolute_error(y_meta_test, pred_ridge_meta)
    r2_ridge = r2_score(y_meta_test, pred_ridge_meta)
    print(f"\\n  Ridge: MAE={mae_ridge/60:.1f}min  R²={r2_ridge:.4f}")

    # Ridge weights
    print("    Weights:")
    for feat, w in zip(META_FEATURES, ridge_meta.coef_):
        print(f"      {feat:20s}: {w:.4f}")

    # LightGBM meta-learner
    lgb_meta = lgb.LGBMRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        random_state=42, n_jobs=-1, verbose=-1,
    )
    lgb_meta.fit(X_meta_train, y_meta_train)
    pred_lgb_meta = lgb_meta.predict(X_meta_test)
    mae_lgb = mean_absolute_error(y_meta_test, pred_lgb_meta)
    r2_lgb = r2_score(y_meta_test, pred_lgb_meta)
    print(f"  LightGBM: MAE={mae_lgb/60:.1f}min  R²={r2_lgb:.4f}")

    # LightGBM feature importance
    fi_meta = pd.DataFrame({'feature': META_FEATURES, 'importance': lgb_meta.feature_importances_})
    fi_meta = fi_meta.sort_values('importance', ascending=False)
    print("    Feature importance:")
    for _, row in fi_meta.iterrows():
        print(f"      {row['feature']:20s}: {row['importance']:.0f}")

    # Pick best
    best_meta = 'lgb' if mae_lgb < mae_ridge else 'ridge'
    best_pred = pred_lgb_meta if best_meta == 'lgb' else pred_ridge_meta
    best_mae = min(mae_lgb, mae_ridge)
    print(f"\\n  Best meta-learner: {best_meta} (MAE={best_mae/60:.1f}min)")

    best_models[DIST] = {
        'type': best_meta,
        'lgb': lgb_meta, 'ridge': ridge_meta, 'scaler': scaler_meta,
        'meta_test': meta_test, 'y_meta_test': y_meta_test,
        'best_pred': best_pred, 'best_mae': best_mae,
    }

    # Individual model comparisons
    comparisons = {}
    for col in ['pred_xgb', 'pred_lgb', 'pred_cat', 'pred_rf', 'pred_ridge',
                'pred_xgb_tuned', 'pred_chained', 'bayes_pred', 'neural_pred']:
        if col in meta_test.columns and meta_test[col].notna().sum() > 100:
            mae_i = mean_absolute_error(y_meta_test, meta_test[col].values)
            comparisons[col] = mae_i
    comparisons[f'ensemble_{best_meta}'] = best_mae

    ensemble_results[DIST] = comparisons"""),

md("## 5. Compare Ensemble vs Individual Models (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in ensemble_results:
        continue
    print(f"\\n{'='*70}")
    print(f"  {DIST}: ENSEMBLE vs INDIVIDUAL MODELS")
    print(f"{'='*70}")

    comparisons = ensemble_results[DIST]
    for name, mae_val in sorted(comparisons.items(), key=lambda x: x[1]):
        marker = " ← ENSEMBLE" if 'ensemble' in name else ""
        print(f"  {name:25s}: MAE={mae_val/60:.1f}min{marker}")

    # Simple average baseline
    meta_test = best_models[DIST]['meta_test']
    y_meta_test = best_models[DIST]['y_meta_test']
    avg_cols = [c for c in ['pred_xgb', 'pred_lgb', 'pred_cat']
                if c in meta_test.columns and meta_test[c].notna().sum() > 100]
    if avg_cols:
        simple_avg = meta_test[avg_cols].mean(axis=1).values
        mae_avg = mean_absolute_error(y_meta_test, simple_avg)
        print(f"  {'simple_average':25s}: MAE={mae_avg/60:.1f}min")"""),

md("## 6. Adaptive Weighting by Tier (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in best_models:
        continue
    print(f"\\n--- {DIST}: Ensemble by data-richness tier ---")

    bm = best_models[DIST]
    meta_test = bm['meta_test']
    y_meta_test = bm['y_meta_test']
    best_pred = bm['best_pred']

    tiers = {
        'Tier 0 (0 races)': meta_test['n_prior_races'] == 0,
        'Tier 1 (1-2 races)': (meta_test['n_prior_races'] >= 1) & (meta_test['n_prior_races'] <= 2),
        'Tier 2 (3-5 races)': (meta_test['n_prior_races'] >= 3) & (meta_test['n_prior_races'] <= 5),
        'Tier 3 (5+ races)': meta_test['n_prior_races'] > 5,
    }

    for tier_name, mask in tiers.items():
        n = mask.sum()
        if n < 50:
            continue
        mae_tier = mean_absolute_error(y_meta_test[mask], best_pred[mask])
        # Best individual for comparison
        best_indiv = float('inf')
        for col in ['pred_xgb', 'pred_lgb', 'pred_cat']:
            if col in meta_test.columns and meta_test[col].notna().sum() > 100:
                mae_i = mean_absolute_error(y_meta_test[mask], meta_test.loc[mask, col].values)
                best_indiv = min(best_indiv, mae_i)
        improvement = (best_indiv - mae_tier) / best_indiv * 100 if best_indiv < float('inf') else 0
        print(f"  {tier_name:25s}: n={n:>6,}  ensemble={mae_tier/60:.1f}min  "
              f"best_indiv={best_indiv/60:.1f}min  {improvement:+.1f}%")"""),

md("## 7. Calibration Check — Quantile Coverage (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in best_models:
        continue
    meta_test = best_models[DIST]['meta_test']
    y_meta_test = best_models[DIST]['y_meta_test']

    print(f"\\n--- {DIST}: Quantile calibration ---")
    for q_val, q_col in [(5, 'q05'), (25, 'q25'), (50, 'q50'), (75, 'q75'), (95, 'q95')]:
        if q_col in meta_test.columns:
            coverage = (y_meta_test <= meta_test[q_col].values).mean()
            expected = q_val / 100
            status = '✓' if abs(coverage - expected) < 0.03 else '✗'
            print(f"  q{q_val:02d}: expected={expected:.2f}  actual={coverage:.3f}  {status}")"""),

md("## 8. Save Outputs (Per Distance)"),

code("""all_eval_rows = []

for DIST in MODEL_DISTANCES:
    if DIST not in meta_dfs or DIST not in best_models:
        continue
    print(f"\\n--- Saving {DIST} ---")

    meta = meta_dfs[DIST]
    bm = best_models[DIST]
    META_FEATURES = meta_features_by_dist[DIST]

    # Generate ensemble predictions for full dataset
    X_all = meta[META_FEATURES].values
    if bm['type'] == 'lgb':
        meta['ensemble_pred'] = bm['lgb'].predict(X_all)
    else:
        meta['ensemble_pred'] = bm['ridge'].predict(bm['scaler'].transform(X_all))

    # Output columns
    out_cols = ['athlete_hash', 'event_distance', 'total_sec', 'ensemble_pred']
    for col in ['pred_xgb', 'pred_lgb', 'pred_xgb_tuned', 'pred_chained',
                'bayes_pred', 'neural_pred', 'n_prior_races',
                'q05', 'q25', 'q50', 'q75', 'q95']:
        if col in meta.columns:
            out_cols.append(col)

    ensemble_out = meta[[c for c in out_cols if c in meta.columns]].copy()
    fname = f'ensemble_predictions_{DIST}.csv'
    ensemble_out.to_csv(CLEANED / fname, index=False)
    print(f"  {fname}: {len(ensemble_out):,}")

    # Evaluation rows
    for model_name, mae_val in ensemble_results.get(DIST, {}).items():
        all_eval_rows.append({'distance': DIST, 'model': model_name, 'MAE_sec': mae_val,
                              'MAE_min': mae_val/60})

# Combined evaluation summary
if all_eval_rows:
    eval_df = pd.DataFrame(all_eval_rows).sort_values(['distance', 'MAE_sec'])
    eval_df.to_csv(CLEANED / 'ensemble_evaluation.csv', index=False)
    print(f"\\nensemble_evaluation.csv: {len(eval_df)} rows")
    print(f"\\nFinal rankings:")
    for DIST in MODEL_DISTANCES:
        sub = eval_df[eval_df['distance'] == DIST].head(10)
        if len(sub) == 0:
            continue
        print(f"\\n  {DIST}:")
        for _, row in sub.iterrows():
            print(f"    {row['model']:25s}  MAE={row['MAE_min']:.1f}min")

print("\\n✅ ENSEMBLE COMPLETE (per-distance)")"""),

]

nbf.write(nb, 'research/notebooks/06_ensemble.ipynb')
print("Created 06_ensemble.ipynb")
