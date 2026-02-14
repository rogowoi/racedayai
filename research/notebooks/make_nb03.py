#!/usr/bin/env python3
"""Generate 03_supervised.ipynb — per-distance models."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 03 — Supervised Learning (Per-Distance Models)
**RaceDayAI ML Prediction Engine (Plan 07)**

Separate model suites for each race distance — 70.3 and 140.6 have fundamentally
different distributions, fatigue dynamics, and pacing strategies.

For each distance independently:
- XGBoost / LightGBM / CatBoost / RF / Ridge comparison
- Optuna hyperparameter tuning on best model
- Chained model experiment (swim → bike → run)
- Quantile regression for uncertainty bands

**Reads:** `athlete_race.csv`, `athlete_profile.csv`, `cluster_assignments.csv`
**Writes:** `model_predictions_70.3.csv`, `model_predictions_140.6.csv`,
`quantile_predictions_70.3.csv`, `quantile_predictions_140.6.csv`,
`feature_importance.csv`, `supervised_results.csv`"""),

code("""import pandas as pd
import numpy as np
import gc, warnings, pickle, json
from pathlib import Path
from time import time
from sklearn.model_selection import GroupKFold, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
warnings.filterwarnings('ignore')

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'

import xgboost as xgb
import lightgbm as lgb
import catboost as cb
print(f"XGBoost {xgb.__version__}, LightGBM {lgb.__version__}, CatBoost {cb.__version__}")"""),

md("## 1. Load & Merge Data"),

code("""t0 = time()
races = pd.read_csv(CLEANED / 'athlete_race.csv', low_memory=False)
profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
clusters = pd.read_csv(CLEANED / 'cluster_assignments.csv', low_memory=False)
print(f"Races: {len(races):,} | Profiles: {len(profiles):,} | Clusters: {len(clusters):,}")

# Merge profile + cluster features onto races
profile_cols = ['athlete_hash', 'total_races', 'pb_total_sec',
                'swim_strength_z', 'bike_strength_z', 'run_strength_z',
                'improvement_slope', 'consistency_cv', 'dnf_rate']
pcols = [c for c in profile_cols if c in profiles.columns]
df = races.merge(profiles[pcols], on='athlete_hash', how='left', suffixes=('','_prof'))

cluster_cols = ['athlete_hash', 'cluster_id']
ccols = [c for c in cluster_cols if c in clusters.columns]
df = df.merge(clusters[ccols], on='athlete_hash', how='left')

# Filter: AG athletes with valid total_sec
df = df[df['is_pro'] != True].copy()
df = df[df['total_sec'].notna() & (df['total_sec'] > 3600) & (df['total_sec'] < 61200)].copy()
df['year'] = pd.to_numeric(df['event_year'], errors='coerce')

print(f"Total AG records with valid times: {len(df):,}")
for dist in df['event_distance'].value_counts().head(6).index:
    n = (df['event_distance'] == dist).sum()
    print(f"  {dist}: {n:,}")
print(f"Loaded in {time()-t0:.1f}s")"""),

md("## 2. Feature Engineering (distance-agnostic)"),

code("""# Encode categoricals
le_gender = LabelEncoder()
df['gender_enc'] = le_gender.fit_transform(df['gender'].fillna('M'))

# Age band as numeric
df['age_band'] = pd.to_numeric(df['age_group'].str.extract(r'(\\d+)', expand=False), errors='coerce')

# Country frequency encoding (top 30)
country_counts = df['country'].value_counts()
top_countries = country_counts.head(30).index.tolist()
df['country_enc'] = df['country'].apply(lambda x: top_countries.index(x) + 1 if x in top_countries else 0)

# Cluster (fill -1 for missing)
df['cluster_id'] = df['cluster_id'].fillna(-1).astype(int)

# Features — NO distance_enc since we train per-distance
FEATURES = [
    'gender_enc', 'age_band', 'country_enc', 'year',
    'total_races', 'pb_total_sec',
    'swim_strength_z', 'bike_strength_z', 'run_strength_z',
    'improvement_slope', 'consistency_cv', 'dnf_rate',
    'cluster_id',
]

TARGET = 'total_sec'
SEGMENT_TARGETS = ['swim_sec', 'bike_sec', 'run_sec']

# Fill NaN features with median (per-distance fill happens later)
for col in FEATURES:
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].median())

print(f"Features ({len(FEATURES)}): {FEATURES}")"""),

md("""## 3. Per-Distance Model Training

Core principle: **70.3 and 140.6 are different sports.** Fade ratio, pacing strategies,
nutrition impact, and performance distributions are fundamentally different. Training
separate models avoids the model wasting capacity on distance discrimination and lets
it focus on what actually drives performance within each distance.

Sprint and Olympic get simpler models (less data) or are handled by scaling from 70.3."""),

code("""# Distances to model separately
MODEL_DISTANCES = ['70.3', '140.6']

# Storage for all results
all_results = {}
all_predictions = {}
all_quantile_preds = {}
all_feature_importance = {}
all_models = {}

def evaluate(name, y_true, y_pred):
    mae = mean_absolute_error(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    return {'MAE_sec': mae, 'MAE_min': mae/60, 'MAPE': mape, 'R2': r2}

def print_eval(name, metrics):
    print(f"  {name:25s}  MAE={metrics['MAE_min']:.1f}min  MAPE={metrics['MAPE']:.3f}  R²={metrics['R2']:.4f}")

def random_athlete_split(data, train_frac=0.70, val_frac=0.15, seed=42):
    \"\"\"Split by athlete to prevent data leakage. Same athlete stays in one split.\"\"\"
    athletes = data['athlete_hash'].unique()
    rng = np.random.RandomState(seed)
    rng.shuffle(athletes)
    n = len(athletes)
    n_train = int(train_frac * n)
    n_val = int(val_frac * n)
    train_ath = set(athletes[:n_train])
    val_ath = set(athletes[n_train:n_train + n_val])
    test_ath = set(athletes[n_train + n_val:])
    train = data[data['athlete_hash'].isin(train_ath)]
    val = data[data['athlete_hash'].isin(val_ath)]
    test = data[data['athlete_hash'].isin(test_ath)]
    return train, val, test"""),

md("### 3.1 Training Loop — Each Distance Gets Its Own Model Suite"),

code("""for DIST in MODEL_DISTANCES:
    print("\\n" + "="*70)
    print(f"  DISTANCE: {DIST}")
    print("="*70)

    # Filter to this distance
    dist_df = df[df['event_distance'] == DIST].copy()
    dist_df = dist_df.dropna(subset=[TARGET])
    print(f"Records: {len(dist_df):,}")
    print(f"Time range: {dist_df[TARGET].min()/3600:.1f}h — {dist_df[TARGET].max()/3600:.1f}h")
    print(f"Median: {dist_df[TARGET].median()/3600:.2f}h  Mean: {dist_df[TARGET].mean()/3600:.2f}h")

    # Random split (grouped by athlete to prevent leakage)
    train, val, test = random_athlete_split(dist_df)
    print(f"Train: {len(train):,} | Val: {len(val):,} | Test: {len(test):,}")

    if len(train) < 1000 or len(val) < 100 or len(test) < 100:
        print(f"  ⚠ Insufficient data for {DIST}, skipping")
        continue

    X_train, y_train = train[FEATURES].values, train[TARGET].values
    X_val, y_val = val[FEATURES].values, val[TARGET].values
    X_test, y_test = test[FEATURES].values, test[TARGET].values

    results = {}

    # ── Ridge ──
    scaler_r = StandardScaler()
    X_tr_sc = scaler_r.fit_transform(X_train)
    X_v_sc = scaler_r.transform(X_val)
    X_te_sc = scaler_r.transform(X_test)
    ridge = Ridge(alpha=1.0)
    ridge.fit(X_tr_sc, y_train)
    results['Ridge_val'] = evaluate('Ridge', y_val, ridge.predict(X_v_sc))
    results['Ridge_test'] = evaluate('Ridge', y_test, ridge.predict(X_te_sc))
    print_eval('Ridge (val)', results['Ridge_val'])
    print_eval('Ridge (test)', results['Ridge_test'])

    # ── Random Forest ──
    rf = RandomForestRegressor(n_estimators=200, max_depth=20, min_samples_leaf=20,
                               n_jobs=-1, random_state=42)
    rf.fit(X_train, y_train)
    results['RF_val'] = evaluate('RF', y_val, rf.predict(X_val))
    results['RF_test'] = evaluate('RF', y_test, rf.predict(X_test))
    print_eval('RandomForest (val)', results['RF_val'])
    print_eval('RandomForest (test)', results['RF_test'])

    # ── XGBoost ──
    xgb_m = xgb.XGBRegressor(
        n_estimators=500, max_depth=8, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        min_child_weight=50, reg_alpha=0.1, reg_lambda=1.0,
        tree_method='hist', random_state=42, n_jobs=-1,
    )
    xgb_m.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=0)
    pred_xgb_val = xgb_m.predict(X_val)
    pred_xgb_test = xgb_m.predict(X_test)
    results['XGB_val'] = evaluate('XGBoost', y_val, pred_xgb_val)
    results['XGB_test'] = evaluate('XGBoost', y_test, pred_xgb_test)
    print_eval('XGBoost (val)', results['XGB_val'])
    print_eval('XGBoost (test)', results['XGB_test'])

    # ── LightGBM ──
    lgb_m = lgb.LGBMRegressor(
        n_estimators=500, max_depth=8, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        min_child_samples=50, reg_alpha=0.1, reg_lambda=1.0,
        random_state=42, n_jobs=-1, verbose=-1,
    )
    lgb_m.fit(X_train, y_train, eval_set=[(X_val, y_val)],
              callbacks=[lgb.log_evaluation(0)])
    pred_lgb_val = lgb_m.predict(X_val)
    pred_lgb_test = lgb_m.predict(X_test)
    results['LGB_val'] = evaluate('LightGBM', y_val, pred_lgb_val)
    results['LGB_test'] = evaluate('LightGBM', y_test, pred_lgb_test)
    print_eval('LightGBM (val)', results['LGB_val'])
    print_eval('LightGBM (test)', results['LGB_test'])

    # ── CatBoost ──
    cat_m = cb.CatBoostRegressor(
        iterations=500, depth=8, learning_rate=0.05,
        subsample=0.8, l2_leaf_reg=3.0,
        random_seed=42, verbose=0,
    )
    cat_m.fit(X_train, y_train, eval_set=(X_val, y_val))
    pred_cat_val = cat_m.predict(X_val)
    pred_cat_test = cat_m.predict(X_test)
    results['CAT_val'] = evaluate('CatBoost', y_val, pred_cat_val)
    results['CAT_test'] = evaluate('CatBoost', y_test, pred_cat_test)
    print_eval('CatBoost (val)', results['CAT_val'])
    print_eval('CatBoost (test)', results['CAT_test'])

    # ── Summary for this distance ──
    print(f"\\n  --- {DIST} Summary (test set) ---")
    test_results = {k: v for k, v in results.items() if 'test' in k}
    best = min(test_results, key=lambda k: test_results[k]['MAE_sec'])
    for k, v in sorted(test_results.items(), key=lambda x: x[1]['MAE_sec']):
        marker = ' ← BEST' if k == best else ''
        print(f"    {k:20s}  MAE={v['MAE_min']:.1f}min  R²={v['R2']:.4f}{marker}")

    # Store
    all_results[DIST] = results
    all_models[DIST] = {
        'xgb': xgb_m, 'lgb': lgb_m, 'cat': cat_m, 'rf': rf, 'ridge': ridge,
        'scaler': scaler_r,
    }

    # Store test predictions
    all_predictions[DIST] = {
        'test_df': test,
        'y_test': y_test,
        'pred_xgb': pred_xgb_test,
        'pred_lgb': pred_lgb_test,
        'pred_cat': pred_cat_test,
        'pred_rf': rf.predict(X_test),
        'pred_ridge': ridge.predict(X_te_sc),
    }

    # Feature importance
    all_feature_importance[DIST] = pd.DataFrame({
        'feature': FEATURES,
        'xgb_importance': xgb_m.feature_importances_,
        'lgb_importance': lgb_m.feature_importances_,
    }).sort_values('xgb_importance', ascending=False)

    gc.collect()"""),

md("## 4. Optuna Tuning (Per Distance, Best Model)"),

code("""import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

for DIST in MODEL_DISTANCES:
    if DIST not in all_models:
        continue
    print(f"\\n{'='*70}")
    print(f"  OPTUNA TUNING: {DIST}")
    print(f"{'='*70}")

    dist_df = df[df['event_distance'] == DIST].dropna(subset=[TARGET])
    train, val, test = random_athlete_split(dist_df)

    X_train, y_train = train[FEATURES].values, train[TARGET].values
    X_val, y_val = val[FEATURES].values, val[TARGET].values
    X_test, y_test = test[FEATURES].values, test[TARGET].values

    # Subsample for speed
    n_tune = min(300000, len(X_train))
    tidx = np.random.RandomState(42).choice(len(X_train), n_tune, replace=False)
    X_tune, y_tune = X_train[tidx], y_train[tidx]

    def objective(trial):
        params = {
            'n_estimators': 500,
            'max_depth': trial.suggest_int('max_depth', 4, 12),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 10, 200),
            'reg_alpha': trial.suggest_float('reg_alpha', 1e-3, 10, log=True),
            'reg_lambda': trial.suggest_float('reg_lambda', 1e-3, 10, log=True),
            'tree_method': 'hist', 'random_state': 42, 'n_jobs': -1,
        }
        model = xgb.XGBRegressor(**params)
        split = int(0.8 * len(X_tune))
        model.fit(X_tune[:split], y_tune[:split],
                  eval_set=[(X_tune[split:], y_tune[split:])], verbose=0)
        return mean_absolute_error(y_tune[split:], model.predict(X_tune[split:]))

    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=30, show_progress_bar=True)
    print(f"  Best trial MAE: {study.best_value/60:.1f}min")

    # Retrain with best params
    bp = study.best_params
    bp.update({'n_estimators': 800, 'tree_method': 'hist', 'random_state': 42, 'n_jobs': -1})
    xgb_tuned = xgb.XGBRegressor(**bp)
    xgb_tuned.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=0)

    pred_tuned_test = xgb_tuned.predict(X_test)
    metrics = evaluate('XGB-Tuned', y_test, pred_tuned_test)
    print_eval(f'XGB-Tuned {DIST} (test)', metrics)

    all_results[DIST]['XGB_Tuned_test'] = metrics
    all_models[DIST]['xgb_tuned'] = xgb_tuned
    all_predictions[DIST]['pred_xgb_tuned'] = pred_tuned_test"""),

md("""## 5. Chained Models (Per Distance)

Swim → Bike → Run sequential prediction. Bike model receives swim prediction as input.
Run model receives swim + bike predictions as fatigue carry-through signals.
This captures real fatigue dynamics that differ between 70.3 and 140.6."""),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in all_models:
        continue
    print(f"\\n{'='*70}")
    print(f"  CHAINED MODELS: {DIST}")
    print(f"{'='*70}")

    dist_df = df[(df['event_distance'] == DIST)].dropna(subset=SEGMENT_TARGETS + [TARGET])
    train, val, test = random_athlete_split(dist_df)
    print(f"  Segment-complete: train={len(train):,} val={len(val):,} test={len(test):,}")

    if len(train) < 1000:
        print(f"  ⚠ Insufficient segment data for {DIST}")
        continue

    # SWIM
    print("  --- Swim ---")
    xgb_s = xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05,
                               tree_method='hist', random_state=42, n_jobs=-1, verbosity=0)
    xgb_s.fit(train[FEATURES].values, train['swim_sec'].values)
    ps_val = xgb_s.predict(val[FEATURES].values)
    ps_test = xgb_s.predict(test[FEATURES].values)
    m = evaluate('Swim', val['swim_sec'].values, ps_val)
    print_eval('Swim (val)', m)

    # BIKE — swim_pred as extra feature
    print("  --- Bike (+swim_pred) ---")
    FEAT_B = FEATURES + ['swim_pred']
    for split_data, pred_swim in [(train, xgb_s.predict(train[FEATURES].values)),
                                   (val, ps_val), (test, ps_test)]:
        split_data = split_data.copy()
        split_data['swim_pred'] = pred_swim

    train_b = train.copy(); train_b['swim_pred'] = xgb_s.predict(train[FEATURES].values)
    val_b = val.copy(); val_b['swim_pred'] = ps_val
    test_b = test.copy(); test_b['swim_pred'] = ps_test

    xgb_b = xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05,
                               tree_method='hist', random_state=42, n_jobs=-1, verbosity=0)
    xgb_b.fit(train_b[FEAT_B].values, train['bike_sec'].values)
    pb_val = xgb_b.predict(val_b[FEAT_B].values)
    pb_test = xgb_b.predict(test_b[FEAT_B].values)
    m = evaluate('Bike', val['bike_sec'].values, pb_val)
    print_eval('Bike-chained (val)', m)

    # RUN — swim_pred + bike_pred as extra features
    print("  --- Run (+swim_pred +bike_pred) ---")
    FEAT_R = FEATURES + ['swim_pred', 'bike_pred']
    train_r = train_b.copy(); train_r['bike_pred'] = xgb_b.predict(train_b[FEAT_B].values)
    val_r = val_b.copy(); val_r['bike_pred'] = pb_val
    test_r = test_b.copy(); test_r['bike_pred'] = pb_test

    xgb_r = xgb.XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05,
                               tree_method='hist', random_state=42, n_jobs=-1, verbosity=0)
    xgb_r.fit(train_r[FEAT_R].values, train['run_sec'].values)
    pr_val = xgb_r.predict(val_r[FEAT_R].values)
    pr_test = xgb_r.predict(test_r[FEAT_R].values)
    m = evaluate('Run', val['run_sec'].values, pr_val)
    print_eval('Run-chained (val)', m)

    # CHAINED TOTAL
    chained_val = ps_val + pb_val + pr_val
    chained_test = ps_test + pb_test + pr_test
    m_val = evaluate('Chained', val['total_sec'].values, chained_val)
    m_test = evaluate('Chained', test['total_sec'].values, chained_test)
    print_eval(f'Chained-Total {DIST} (val)', m_val)
    print_eval(f'Chained-Total {DIST} (test)', m_test)

    all_results[DIST]['Chained_val'] = m_val
    all_results[DIST]['Chained_test'] = m_test
    all_predictions[DIST]['pred_chained'] = chained_test
    all_predictions[DIST]['pred_swim'] = ps_test
    all_predictions[DIST]['pred_bike'] = pb_test
    all_predictions[DIST]['pred_run'] = pr_test"""),

md("""## 6. Quantile Regression (Per Distance)

Separate quantile models per distance — uncertainty bands are narrower for 70.3 than 140.6."""),

code("""quantiles = [0.05, 0.25, 0.50, 0.75, 0.95]

for DIST in MODEL_DISTANCES:
    if DIST not in all_models:
        continue
    print(f"\\n--- Quantile Regression: {DIST} ---")

    dist_df = df[df['event_distance'] == DIST].dropna(subset=[TARGET])
    train, val, test = random_athlete_split(dist_df)

    X_train, y_train = train[FEATURES].values, train[TARGET].values
    X_val, y_val = val[FEATURES].values, val[TARGET].values
    X_test, y_test = test[FEATURES].values, test[TARGET].values

    q_preds_test = {}
    q_preds_val = {}

    for q in quantiles:
        qm = lgb.LGBMRegressor(
            n_estimators=300, max_depth=8, learning_rate=0.05,
            objective='quantile', alpha=q,
            subsample=0.8, colsample_bytree=0.8,
            random_state=42, n_jobs=-1, verbose=-1,
        )
        qm.fit(X_train, y_train)
        q_preds_val[q] = qm.predict(X_val)
        q_preds_test[q] = qm.predict(X_test)

    # Calibration check
    print(f"  Quantile calibration ({DIST}, val):")
    for q in quantiles:
        coverage = (y_val <= q_preds_val[q]).mean()
        status = '✓' if abs(coverage - q) < 0.03 else '✗'
        print(f"    q={q:.2f}: expected={q:.2f}  actual={coverage:.3f}  {status}")

    iqr = q_preds_test[0.75] - q_preds_test[0.25]
    print(f"  Median IQR: {np.median(iqr)/60:.1f}min  Mean IQR: {np.mean(iqr)/60:.1f}min")

    all_quantile_preds[DIST] = q_preds_test"""),

md("## 7. Feature Importance (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in all_feature_importance:
        continue
    fi = all_feature_importance[DIST]
    print(f"\\n--- Feature Importance: {DIST} ---")
    for _, row in fi.iterrows():
        print(f"  {row['feature']:25s}  xgb={row['xgb_importance']:.4f}  lgb={row['lgb_importance']:.4f}")"""),

md("## 8. Stratified Evaluation (Per Distance)"),

code("""def stratified_eval(y_true, y_pred, groups, group_name):
    print(f"  Stratified by {group_name}:")
    for g in sorted(groups.unique()):
        mask = groups == g
        if mask.sum() < 50:
            continue
        mae = mean_absolute_error(y_true[mask], y_pred[mask])
        mape = mean_absolute_percentage_error(y_true[mask], y_pred[mask])
        print(f"    {str(g):15s}  n={mask.sum():>7,}  MAE={mae/60:.1f}min  MAPE={mape:.3f}")

for DIST in MODEL_DISTANCES:
    if DIST not in all_predictions:
        continue
    print(f"\\n{'='*70}")
    print(f"  STRATIFIED EVAL: {DIST}")
    print(f"{'='*70}")

    preds = all_predictions[DIST]
    test_data = preds['test_df']
    y_t = preds['y_test']
    # Use tuned XGB if available, else regular XGB
    pred_t = preds.get('pred_xgb_tuned', preds['pred_xgb'])

    # By age bracket
    age_brackets = pd.cut(test_data['age_band'].fillna(35).values, bins=[0, 30, 40, 50, 60, 100],
                           labels=['18-29', '30-39', '40-49', '50-59', '60+'])
    stratified_eval(y_t, pred_t, age_brackets, 'Age Bracket')

    # By finish bracket
    if DIST == '70.3':
        bins = [0, 5, 6, 7, 8, 20]
        labels = ['<5h', '5-6h', '6-7h', '7-8h', '8h+']
    else:
        bins = [0, 10, 12, 14, 16, 30]
        labels = ['<10h', '10-12h', '12-14h', '14-16h', '16h+']
    finish_brackets = pd.cut(y_t / 3600, bins=bins, labels=labels)
    stratified_eval(y_t, pred_t, finish_brackets, 'Finish Bracket')

    # By experience
    exp = test_data['total_races'].fillna(0).values
    exp_brackets = pd.cut(exp, bins=[-1, 0, 2, 5, 100],
                           labels=['0 races', '1-2 races', '3-5 races', '5+ races'])
    stratified_eval(y_t, pred_t, exp_brackets, 'Experience')"""),

md("## 9. Cross-Distance Summary"),

code("""print("\\n" + "="*70)
print("  CROSS-DISTANCE COMPARISON (test sets)")
print("="*70)
for DIST in MODEL_DISTANCES:
    if DIST not in all_results:
        continue
    print(f"\\n  {DIST}:")
    test_results = {k: v for k, v in all_results[DIST].items() if 'test' in k.lower()}
    for k, v in sorted(test_results.items(), key=lambda x: x[1]['MAE_sec']):
        print(f"    {k:25s}  MAE={v['MAE_min']:.1f}min  MAPE={v['MAPE']:.3f}  R²={v['R2']:.4f}")"""),

md("## 10. Save Outputs"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in all_predictions:
        continue
    preds = all_predictions[DIST]
    test_data = preds['test_df']

    # Model predictions
    pred_df = test_data[['athlete_hash', 'event_distance', 'event_year', 'total_sec']].copy()
    pred_df['pred_xgb'] = preds['pred_xgb']
    pred_df['pred_lgb'] = preds['pred_lgb']
    pred_df['pred_cat'] = preds['pred_cat']
    pred_df['pred_rf'] = preds['pred_rf']
    pred_df['pred_ridge'] = preds['pred_ridge']
    if 'pred_xgb_tuned' in preds:
        pred_df['pred_xgb_tuned'] = preds['pred_xgb_tuned']
    if 'pred_chained' in preds:
        pred_df['pred_chained'] = preds['pred_chained']
        pred_df['pred_swim'] = preds['pred_swim']
        pred_df['pred_bike'] = preds['pred_bike']
        pred_df['pred_run'] = preds['pred_run']

    # Add quantiles
    if DIST in all_quantile_preds:
        for q in quantiles:
            pred_df[f'q{int(q*100):02d}'] = all_quantile_preds[DIST][q]

    fname = f'model_predictions_{DIST}.csv'
    pred_df.to_csv(CLEANED / fname, index=False)
    print(f"{fname}: {len(pred_df):,} rows")

# Feature importance (combined)
fi_all = []
for DIST in MODEL_DISTANCES:
    if DIST in all_feature_importance:
        fi = all_feature_importance[DIST].copy()
        fi['distance'] = DIST
        fi_all.append(fi)
if fi_all:
    fi_combined = pd.concat(fi_all)
    fi_combined.to_csv(CLEANED / 'feature_importance.csv', index=False)
    print(f"feature_importance.csv: {len(fi_combined)} rows")

# Results summary
rows = []
for DIST in MODEL_DISTANCES:
    if DIST not in all_results:
        continue
    for model_name, metrics in all_results[DIST].items():
        rows.append({'distance': DIST, 'model': model_name, **metrics})
res_summary = pd.DataFrame(rows)
res_summary.to_csv(CLEANED / 'supervised_results.csv', index=False)
print(f"supervised_results.csv: {len(res_summary)} rows")

print("\\n✅ SUPERVISED LEARNING COMPLETE (per-distance models)")"""),

]

nbf.write(nb, 'research/notebooks/03_supervised.ipynb')
print("Created 03_supervised.ipynb")
