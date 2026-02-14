#!/usr/bin/env python3
"""Generate 07_dnf_risk.ipynb — per-distance DNF risk classifiers."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 07 — DNF Risk Classifier (Per-Distance)
**RaceDayAI ML Prediction Engine (Plan 07)**

Per-distance binary classification: finisher vs DNF/DNS/DQ. DNF rates and risk factors differ
significantly between 70.3 and 140.6 — separate models capture these differences.
LightGBM with class imbalance handling, SHAP explainability, calibration curves.

**Reads:** `athlete_race.csv`, `athlete_profile.csv`, `cluster_assignments.csv`
**Writes:** `dnf_model_predictions_70.3.csv`, `dnf_model_predictions_140.6.csv`"""),

code("""import pandas as pd
import numpy as np
import warnings
from pathlib import Path
from time import time
from sklearn.metrics import (roc_auc_score, average_precision_score,
                             precision_recall_curve, roc_curve,
                             classification_report, brier_score_loss)
from sklearn.calibration import calibration_curve
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb
warnings.filterwarnings('ignore')

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'

MODEL_DISTANCES = ['70.3', '140.6']"""),

md("## 1. Load Data & Define DNF Target"),

code("""races = pd.read_csv(CLEANED / 'athlete_race.csv', low_memory=False)
profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
clusters = pd.read_csv(CLEANED / 'cluster_assignments.csv', low_memory=False)

# DNF target comes from CoachCox finish_status field
# Only CoachCox has reliable DNF data
df = races[races['source'] == 'coachcox'].copy() if 'source' in races.columns else races.copy()

# Define target
if 'finish_status' in df.columns:
    df['is_dnf'] = df['finish_status'].fillna('finisher').str.upper().isin(['DNF', 'DNS', 'DQ']).astype(int)
else:
    df['is_dnf'] = df['total_sec'].isna().astype(int)

# Filter to AG
df = df[df['is_pro'] != True].copy()

# Merge profiles
pcols = ['athlete_hash', 'total_races', 'pb_total_sec', 'consistency_cv',
         'improvement_slope', 'dnf_rate', 'dnf_count',
         'swim_strength_z', 'bike_strength_z', 'run_strength_z']
pcols = [c for c in pcols if c in profiles.columns]
df = df.merge(profiles[pcols], on='athlete_hash', how='left')

# Merge clusters
ccols = ['athlete_hash', 'cluster_id']
ccols = [c for c in ccols if c in clusters.columns]
df = df.merge(clusters[ccols], on='athlete_hash', how='left')

# Per-distance summary
for d in MODEL_DISTANCES:
    mask = df['event_distance'] == d
    n = mask.sum()
    dnf_n = df.loc[mask, 'is_dnf'].sum()
    print(f"  {d}: {n:,} records, DNF/DNS/DQ: {dnf_n:,} ({100*dnf_n/max(n,1):.2f}%)")
print(f"Total: {len(df):,}")"""),

md("## 2. Feature Engineering"),

code("""# Gender
le_g = LabelEncoder()
df['gender_enc'] = le_g.fit_transform(df['gender'].fillna('M'))

# Age band
df['age_band'] = pd.to_numeric(df['age_group'].str.extract(r'(\\d+)', expand=False), errors='coerce')

# Year
df['year'] = pd.to_numeric(df['event_year'], errors='coerce')

# Cluster
df['cluster_id'] = df['cluster_id'].fillna(-1).astype(int)

# Historical DNF rate
df['athlete_dnf_rate'] = df['dnf_rate'].fillna(0)
df['athlete_dnf_count'] = df['dnf_count'].fillna(0) if 'dnf_count' in df.columns else 0

# Features (no distance — we train separate models)
FEATURES = [
    'gender_enc', 'age_band', 'year',
    'total_races', 'pb_total_sec',
    'swim_strength_z', 'bike_strength_z', 'run_strength_z',
    'improvement_slope', 'consistency_cv',
    'cluster_id',
    'athlete_dnf_rate', 'athlete_dnf_count',
]
FEATURES = [f for f in FEATURES if f in df.columns]

# Fill NaN
for col in FEATURES:
    if df[col].isna().any():
        df[col] = df[col].fillna(df[col].median() if df[col].dtype != 'object' else 0)

TARGET = 'is_dnf'
print(f"Features: {len(FEATURES)}")
print(f"  {FEATURES}")"""),

md("## 3. Per-Distance Training"),

code("""dnf_results = {}

for DIST in MODEL_DISTANCES:
    print(f"\\n{'='*70}")
    print(f"  DNF CLASSIFIER: {DIST}")
    print(f"{'='*70}")

    dist_df = df[df['event_distance'] == DIST].copy()
    if len(dist_df) < 500:
        print(f"  ⚠ Insufficient data for {DIST}")
        continue

    print(f"  Records: {len(dist_df):,}")
    print(f"  DNF rate: {dist_df['is_dnf'].mean():.4f} ({dist_df['is_dnf'].sum():,} DNFs)")

    # Random split (grouped by athlete to prevent leakage)
    athletes = dist_df['athlete_hash'].unique()
    rng = np.random.RandomState(42)
    rng.shuffle(athletes)
    n = len(athletes)
    n_train = int(0.70 * n)
    n_val = int(0.15 * n)
    train_ath = set(athletes[:n_train])
    val_ath = set(athletes[n_train:n_train + n_val])
    test_ath = set(athletes[n_train + n_val:])
    train = dist_df[dist_df['athlete_hash'].isin(train_ath)].copy()
    val = dist_df[dist_df['athlete_hash'].isin(val_ath)].copy()
    test = dist_df[dist_df['athlete_hash'].isin(test_ath)].copy()

    # Skip if not enough data in any split
    for name, split_df in [('train', train), ('val', val), ('test', test)]:
        dnf_n = split_df['is_dnf'].sum()
        print(f"  {name:5s}: {len(split_df):,} (DNF: {dnf_n:,}, rate: {split_df['is_dnf'].mean():.4f})")
        if dnf_n < 10:
            print(f"  ⚠ Too few DNFs in {name} split")

    X_train = train[FEATURES].values
    y_train = train[TARGET].values
    X_val = val[FEATURES].values
    y_val = val[TARGET].values
    X_test = test[FEATURES].values
    y_test = test[TARGET].values

    # Class weight
    n_pos = y_train.sum()
    n_neg = len(y_train) - n_pos
    scale_pos_weight = n_neg / max(n_pos, 1)
    print(f"  Class imbalance: 1:{scale_pos_weight:.1f}")

    # Train LightGBM
    lgb_dnf = lgb.LGBMClassifier(
        n_estimators=500, max_depth=6, learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        subsample=0.8, colsample_bytree=0.8,
        min_child_samples=50,
        random_state=42, n_jobs=-1, verbose=-1,
    )
    lgb_dnf.fit(X_train, y_train,
                eval_set=[(X_val, y_val)],
                callbacks=[lgb.log_evaluation(100)])

    # Predict
    prob_val = lgb_dnf.predict_proba(X_val)[:, 1]
    prob_test = lgb_dnf.predict_proba(X_test)[:, 1]

    # Metrics
    if y_val.sum() > 0:
        auc_val = roc_auc_score(y_val, prob_val)
        ap_val = average_precision_score(y_val, prob_val)
        print(f"\\n  Validation: AUC={auc_val:.4f}  AP={ap_val:.4f}")

    if y_test.sum() > 0:
        auc_test = roc_auc_score(y_test, prob_test)
        ap_test = average_precision_score(y_test, prob_test)
        brier_test = brier_score_loss(y_test, prob_test)
        print(f"  Test:       AUC={auc_test:.4f}  AP={ap_test:.4f}  Brier={brier_test:.4f}")

    dnf_results[DIST] = {
        'model': lgb_dnf,
        'dist_df': dist_df,
        'test': test,
        'y_test': y_test,
        'prob_test': prob_test,
    }"""),

md("## 4. Threshold Selection (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in dnf_results:
        continue
    print(f"\\n--- Threshold: {DIST} ---")

    r = dnf_results[DIST]
    y_test = r['y_test']
    prob_test = r['prob_test']

    if y_test.sum() == 0:
        print("  No DNFs in test set — skipping threshold selection")
        continue

    precision_arr, recall_arr, thresholds = precision_recall_curve(y_test, prob_test)
    f1_scores = 2 * precision_arr * recall_arr / (precision_arr + recall_arr + 1e-8)
    best_f1_idx = np.argmax(f1_scores)
    best_threshold = thresholds[min(best_f1_idx, len(thresholds)-1)]
    print(f"  Best F1 threshold: {best_threshold:.3f} (F1={f1_scores[best_f1_idx]:.3f})")

    THRESHOLD_ELEVATED = best_threshold * 0.5
    THRESHOLD_HIGH = best_threshold
    print(f"  Elevated risk: >{THRESHOLD_ELEVATED:.3f}")
    print(f"  High risk:     >{THRESHOLD_HIGH:.3f}")

    pred_labels = (prob_test >= THRESHOLD_HIGH).astype(int)
    print(f"\\n  Classification report (threshold={THRESHOLD_HIGH:.3f}):")
    print(classification_report(y_test, pred_labels, target_names=['Finisher', 'DNF']))

    r['threshold_elevated'] = THRESHOLD_ELEVATED
    r['threshold_high'] = THRESHOLD_HIGH"""),

md("## 5. Calibration Analysis (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in dnf_results:
        continue
    r = dnf_results[DIST]
    y_test = r['y_test']
    prob_test = r['prob_test']

    if y_test.sum() < 10:
        continue

    print(f"\\n--- Calibration: {DIST} ---")
    prob_true, prob_pred = calibration_curve(y_test, prob_test, n_bins=10, strategy='quantile')
    for pt, pp in zip(prob_true, prob_pred):
        status = '✓' if abs(pt - pp) < 0.02 else '~' if abs(pt - pp) < 0.05 else '✗'
        print(f"  Predicted: {pp:.3f}  Actual: {pt:.3f}  {status}")

    # Plot
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        fpr, tpr, _ = roc_curve(y_test, prob_test)
        auc_val = roc_auc_score(y_test, prob_test)
        axes[0].plot(fpr, tpr, 'b-', label=f'LightGBM (AUC={auc_val:.3f})')
        axes[0].plot([0,1], [0,1], 'k--', alpha=0.3)
        axes[0].set_xlabel('False Positive Rate')
        axes[0].set_ylabel('True Positive Rate')
        axes[0].set_title(f'ROC Curve — DNF Risk ({DIST})')
        axes[0].legend()

        axes[1].plot(prob_pred, prob_true, 'bo-', label='LightGBM')
        axes[1].plot([0,1], [0,1], 'k--', alpha=0.3, label='Perfect')
        axes[1].set_xlabel('Predicted Probability')
        axes[1].set_ylabel('Actual Probability')
        axes[1].set_title(f'Calibration Curve ({DIST})')
        axes[1].legend()

        plt.tight_layout()
        fname = f'dnf_curves_{DIST.replace(".", "")}.png'
        plt.savefig(CLEANED / fname, dpi=150)
        plt.show()
        print(f"  Saved {fname}")
    except Exception as e:
        print(f"  Plotting failed: {e}")"""),

md("## 6. SHAP Feature Importance (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in dnf_results:
        continue
    print(f"\\n--- SHAP: {DIST} ---")
    r = dnf_results[DIST]
    lgb_dnf = r['model']
    X_test = r['test'][FEATURES].values

    try:
        import shap
        explainer = shap.TreeExplainer(lgb_dnf)
        n_shap = min(5000, len(X_test))
        shap_values = explainer.shap_values(X_test[:n_shap])

        if isinstance(shap_values, list):
            shap_vals = shap_values[1]
        else:
            shap_vals = shap_values

        mean_abs_shap = np.abs(shap_vals).mean(axis=0)
        fi_shap = pd.DataFrame({'feature': FEATURES, 'mean_abs_shap': mean_abs_shap})
        fi_shap = fi_shap.sort_values('mean_abs_shap', ascending=False)
        print(f"  SHAP Feature Importance ({DIST}):")
        for _, row in fi_shap.iterrows():
            print(f"    {row['feature']:25s}: {row['mean_abs_shap']:.4f}")

    except ImportError:
        print("  SHAP not installed — using LightGBM native importance")
        fi_lgb = pd.DataFrame({'feature': FEATURES, 'importance': lgb_dnf.feature_importances_})
        fi_lgb = fi_lgb.sort_values('importance', ascending=False)
        for _, row in fi_lgb.iterrows():
            print(f"    {row['feature']:25s}: {row['importance']}")"""),

md("## 7. Save Outputs (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in dnf_results:
        continue
    print(f"\\n--- Saving {DIST} ---")

    r = dnf_results[DIST]
    lgb_dnf = r['model']
    dist_df = r['dist_df']
    THRESHOLD_ELEVATED = r.get('threshold_elevated', 0.05)
    THRESHOLD_HIGH = r.get('threshold_high', 0.10)

    # Full dataset predictions
    X_all = dist_df[FEATURES].values
    dist_df = dist_df.copy()
    dist_df['dnf_prob'] = lgb_dnf.predict_proba(X_all)[:, 1]
    dist_df['dnf_risk_level'] = 'low'
    dist_df.loc[dist_df['dnf_prob'] > THRESHOLD_ELEVATED, 'dnf_risk_level'] = 'elevated'
    dist_df.loc[dist_df['dnf_prob'] > THRESHOLD_HIGH, 'dnf_risk_level'] = 'high'

    out = dist_df[['athlete_hash', 'event_distance', 'event_year',
                    'is_dnf', 'dnf_prob', 'dnf_risk_level']].copy()
    fname = f'dnf_model_predictions_{DIST}.csv'
    out.to_csv(CLEANED / fname, index=False)
    print(f"  {fname}: {len(out):,}")
    print(f"    Low:      {(out['dnf_risk_level']=='low').sum():,}")
    print(f"    Elevated: {(out['dnf_risk_level']=='elevated').sum():,}")
    print(f"    High:     {(out['dnf_risk_level']=='high').sum():,}")

print("\\n✅ DNF RISK CLASSIFIER COMPLETE (per-distance)")"""),

]

nbf.write(nb, 'research/notebooks/07_dnf_risk.ipynb')
print("Created 07_dnf_risk.ipynb")
