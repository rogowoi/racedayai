#!/usr/bin/env python3
"""Generate 02_unsupervised.ipynb from scratch."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 02 — Unsupervised Learning
**RaceDayAI ML Prediction Engine (Plan 07)**

Athlete clustering, pacing archetypes, UMAP visualization, anomaly detection.

**Reads:** `athlete_race.csv`, `athlete_profile.csv`
**Writes:** `cluster_assignments.csv`, `pacing_archetypes.csv`, `anomaly_flags.csv`"""),

code("""import pandas as pd
import numpy as np
import gc, warnings
from pathlib import Path
from time import time
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.mixture import GaussianMixture
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from sklearn.ensemble import IsolationForest
warnings.filterwarnings('ignore')

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'
print(f"Data dir: {CLEANED}")
print(f"Files: {[f.name for f in CLEANED.glob('*.csv')]}")"""),

md("## 1. Load Data"),

code("""profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
races = pd.read_csv(CLEANED / 'athlete_race.csv',
                    usecols=['athlete_hash','gender','age_group','event_distance',
                             'swim_pct','bike_pct','run_pct','fade_ratio',
                             'bike_run_ratio','is_pro','total_sec',
                             'swim_sec','bike_sec','run_sec','t1_sec','t2_sec'],
                    low_memory=False)
print(f"Profiles: {len(profiles):,} | Races: {len(races):,}")
print(f"Profile columns: {list(profiles.columns)}")"""),

md("""## 2. Athlete Clustering

Features: swim/bike/run strength z-scores, consistency, experience, improvement slope, fade ratio.
Compare K-Means (silhouette sweep), GMM (BIC), and HDBSCAN."""),

code("""CLUSTER_FEATURES = [
    'swim_strength_z', 'bike_strength_z', 'run_strength_z',
    'consistency_cv', 'total_races', 'improvement_slope', 'avg_fade_ratio',
]

# Filter to athletes with 3+ races and sufficient features
df = profiles[profiles['total_races'] >= 3].copy()
valid = df[CLUSTER_FEATURES].notna().sum(axis=1) >= 5
df = df[valid].copy()
print(f"Clusterable athletes (3+ races, sufficient features): {len(df):,}")

# Prepare feature matrix
X = df[CLUSTER_FEATURES].copy()
X = X.fillna(X.median())
for col in X.columns:
    lo, hi = X[col].quantile([0.01, 0.99])
    X[col] = X[col].clip(lo, hi)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
print(f"Feature matrix: {X_scaled.shape}")
print(f"Feature means (post-scale): {X_scaled.mean(axis=0).round(2)}")"""),

md("### 2.1 K-Means Silhouette Sweep (k=5..20)"),

code("""km_results = []
for k in range(5, 21):
    km = KMeans(n_clusters=k, n_init=10, random_state=42, max_iter=300)
    labels = km.fit_predict(X_scaled)
    sil = silhouette_score(X_scaled, labels, sample_size=min(50000, len(X_scaled)))
    ch = calinski_harabasz_score(X_scaled, labels)
    db = davies_bouldin_score(X_scaled, labels)
    km_results.append({'k': k, 'silhouette': sil, 'calinski_harabasz': ch, 'davies_bouldin': db})
    print(f"  k={k:2d}: sil={sil:.4f}  ch={ch:.0f}  db={db:.3f}")

km_results = pd.DataFrame(km_results)
best_km_k = int(km_results.loc[km_results['silhouette'].idxmax(), 'k'])
print(f"\\nBest K-Means k={best_km_k} (silhouette={km_results['silhouette'].max():.4f})")"""),

md("### 2.2 GMM with BIC Selection (k=5..15)"),

code("""gmm_results = []
for k in range(5, 16):
    gmm = GaussianMixture(n_components=k, covariance_type='full',
                          n_init=3, random_state=42, max_iter=200)
    gmm.fit(X_scaled)
    bic = gmm.bic(X_scaled)
    aic = gmm.aic(X_scaled)
    gmm_results.append({'k': k, 'bic': bic, 'aic': aic})
    print(f"  k={k:2d}: BIC={bic:.0f}  AIC={aic:.0f}")

gmm_results = pd.DataFrame(gmm_results)
best_gmm_k = int(gmm_results.loc[gmm_results['bic'].idxmin(), 'k'])
print(f"\\nBest GMM k={best_gmm_k} (BIC={gmm_results['bic'].min():.0f})")"""),

md("### 2.3 HDBSCAN"),

code("""try:
    import hdbscan
    clusterer = hdbscan.HDBSCAN(min_cluster_size=500, min_samples=50,
                                 metric='euclidean', cluster_selection_method='eom')
    hdb_labels = clusterer.fit_predict(X_scaled)
    n_clusters = len(set(hdb_labels)) - (1 if -1 in hdb_labels else 0)
    n_noise = (hdb_labels == -1).sum()
    print(f"HDBSCAN: {n_clusters} clusters, {n_noise:,} noise points ({100*n_noise/len(hdb_labels):.1f}%)")
    if n_clusters >= 2:
        valid_mask = hdb_labels != -1
        sil = silhouette_score(X_scaled[valid_mask], hdb_labels[valid_mask],
                               sample_size=min(50000, valid_mask.sum()))
        print(f"Silhouette (excl. noise): {sil:.4f}")
except ImportError:
    print("HDBSCAN not installed, skipping")
    hdb_labels = None"""),

md("### 2.4 Final Clustering — K-Means with Best k"),

code("""# Use best K-Means as primary (most interpretable)
print(f"Using K-Means k={best_km_k}")
km_final = KMeans(n_clusters=best_km_k, n_init=20, random_state=42)
df['cluster_id'] = km_final.fit_predict(X_scaled)

# GMM soft assignments
gmm_final = GaussianMixture(n_components=best_gmm_k, covariance_type='full',
                            n_init=5, random_state=42)
gmm_final.fit(X_scaled)
df['gmm_cluster'] = gmm_final.predict(X_scaled)
gmm_probs = gmm_final.predict_proba(X_scaled)
df['gmm_max_prob'] = gmm_probs.max(axis=1)

if hdb_labels is not None:
    df['hdbscan_cluster'] = hdb_labels

# Cluster centroids
centroids = pd.DataFrame(km_final.cluster_centers_, columns=CLUSTER_FEATURES)
centroids['size'] = df['cluster_id'].value_counts().sort_index().values
centroids['pct'] = 100 * centroids['size'] / centroids['size'].sum()

# Auto-name clusters
names = []
for i, row in centroids.iterrows():
    traits = []
    if row['swim_strength_z'] > 0.5: traits.append('StrongSwim')
    if row['bike_strength_z'] > 0.5: traits.append('StrongBike')
    if row['run_strength_z'] > 0.5: traits.append('StrongRun')
    if row['swim_strength_z'] < -0.5: traits.append('WeakSwim')
    if row['bike_strength_z'] < -0.5: traits.append('WeakBike')
    if row['run_strength_z'] < -0.5: traits.append('WeakRun')
    if row['total_races'] > centroids['total_races'].median() + 1: traits.append('Veteran')
    if row['total_races'] < centroids['total_races'].median() - 1: traits.append('Novice')
    if row['avg_fade_ratio'] > 1.1: traits.append('Fader')
    if row['improvement_slope'] < -100: traits.append('Improving')
    name = '_'.join(traits[:3]) if traits else f'Cluster_{i}'
    names.append(name)
centroids['name'] = names
df['cluster_name'] = df['cluster_id'].map(dict(enumerate(names)))

print("\\nCluster Summary:")
for i, row in centroids.iterrows():
    print(f"  [{i}] {row['name']:30s} n={int(row['size']):,} ({row['pct']:.1f}%)")
    print(f"       swim_z={row['swim_strength_z']:.2f}  bike_z={row['bike_strength_z']:.2f}  "
          f"run_z={row['run_strength_z']:.2f}  races={row['total_races']:.1f}  fade={row['avg_fade_ratio']:.3f}")"""),

md("### 2.5 UMAP Visualization"),

code("""try:
    from umap import UMAP

    n_umap = min(100000, len(X_scaled))
    idx = np.random.RandomState(42).choice(len(X_scaled), n_umap, replace=False)
    print(f"Running UMAP on {n_umap:,} points...")

    reducer = UMAP(n_components=2, n_neighbors=30, min_dist=0.3, random_state=42)
    emb_2d = reducer.fit_transform(X_scaled[idx])

    umap_df = pd.DataFrame({
        'athlete_hash': df.iloc[idx]['athlete_hash'].values,
        'umap_x': emb_2d[:, 0], 'umap_y': emb_2d[:, 1],
        'cluster_id': df.iloc[idx]['cluster_id'].values,
    })
    umap_df.to_csv(CLEANED / 'umap_coords.csv', index=False)
    print(f"Saved UMAP coordinates: {len(umap_df):,} points")

    # Quick scatter plot
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(1, 1, figsize=(10, 8))
        scatter = ax.scatter(emb_2d[:, 0], emb_2d[:, 1],
                            c=df.iloc[idx]['cluster_id'].values,
                            cmap='tab10', s=1, alpha=0.3)
        ax.set_title('UMAP — Athlete Clusters')
        ax.set_xlabel('UMAP-1'); ax.set_ylabel('UMAP-2')
        plt.colorbar(scatter, label='Cluster ID')
        plt.tight_layout()
        plt.savefig(CLEANED / 'umap_clusters.png', dpi=150)
        plt.show()
        print("Saved umap_clusters.png")
    except Exception as e:
        print(f"Plotting failed: {e}")

except ImportError:
    print("UMAP not installed, skipping visualization")"""),

md("""## 3. Pacing Archetypes

GMM on [swim_pct, bike_pct, run_pct, fade_ratio] per distance."""),

code("""pac_cols = ['swim_pct', 'bike_pct', 'run_pct', 'fade_ratio']
pac_df = races.dropna(subset=pac_cols).copy()
pac_df = pac_df[pac_df['is_pro'] != True]
print(f"Records with complete pacing data: {len(pac_df):,}")

results_by_dist = {}

for dist in ['70.3', '140.6']:
    subset = pac_df[pac_df['event_distance'] == dist]
    if len(subset) < 1000:
        print(f"[{dist}] Too few records ({len(subset)}), skipping")
        continue
    print(f"\\n[{dist}] {len(subset):,} records")

    X_pac = subset[pac_cols].values
    X_pac = np.clip(X_pac, np.percentile(X_pac, 1, axis=0), np.percentile(X_pac, 99, axis=0))
    pac_scaler = StandardScaler()
    X_pac_scaled = pac_scaler.fit_transform(X_pac)

    # GMM with BIC
    best_bic, best_k = np.inf, 4
    for k in range(3, 9):
        gmm = GaussianMixture(n_components=k, covariance_type='full',
                              n_init=3, random_state=42, max_iter=200)
        gmm.fit(X_pac_scaled)
        bic = gmm.bic(X_pac_scaled)
        if bic < best_bic:
            best_bic, best_k = bic, k
    print(f"  Best GMM components: {best_k}")

    gmm = GaussianMixture(n_components=best_k, covariance_type='full',
                          n_init=5, random_state=42)
    gmm.fit(X_pac_scaled)
    labels = gmm.predict(X_pac_scaled)
    probs = gmm.predict_proba(X_pac_scaled)

    for k_i in range(best_k):
        mask = labels == k_i
        means = subset.loc[mask, pac_cols].mean()
        med_total = subset.loc[mask, 'total_sec'].median()
        archetype = []
        if means['bike_pct'] > subset['bike_pct'].median() + 0.02: archetype.append('AggressiveBike')
        if means['fade_ratio'] > 1.08: archetype.append('HeavyFade')
        if means['fade_ratio'] < 0.95: archetype.append('StrongRun')
        if means['run_pct'] > subset['run_pct'].median() + 0.02: archetype.append('ConservativeBike')
        if not archetype: archetype.append('Balanced')
        name = '_'.join(archetype)
        print(f"  [{k_i}] {name:30s} n={mask.sum():,}  "
              f"swim={means['swim_pct']:.3f} bike={means['bike_pct']:.3f} "
              f"run={means['run_pct']:.3f} fade={means['fade_ratio']:.3f} "
              f"med_total={med_total/3600:.2f}h")

    results_by_dist[dist] = (subset.index, labels, probs)

# Build output
all_labels = pd.Series(np.nan, index=races.index, dtype='float')
all_probs = pd.Series(np.nan, index=races.index, dtype='float')
for dist, (idx, labels, probs) in results_by_dist.items():
    all_labels.loc[idx] = labels
    all_probs.loc[idx] = probs.max(axis=1)

print(f"\\nPacing archetypes assigned: {all_labels.notna().sum():,}")"""),

md("""## 4. Anomaly Detection

Rule-based flags + Isolation Forest per distance."""),

code("""flags = pd.DataFrame(index=races.index)

# Sum check
computed_sum = (races['swim_sec'].fillna(0) + races['bike_sec'].fillna(0) +
                races['run_sec'].fillna(0) + races['t1_sec'].fillna(0) + races['t2_sec'].fillna(0))
has_all = races['swim_sec'].notna() & races['bike_sec'].notna() & races['run_sec'].notna()
flags['sum_mismatch'] = has_all & ((races['total_sec'] - computed_sum).abs() > 120)

# Extreme transitions
flags['extreme_t1'] = races['t1_sec'].notna() & (races['t1_sec'] > 900)
flags['extreme_t2'] = races['t2_sec'].notna() & (races['t2_sec'] > 900)

# Impossible split ratios
for seg in ['swim', 'bike', 'run']:
    col = f'{seg}_pct'
    if col in races.columns:
        flags[f'{seg}_pct_extreme'] = races[col].notna() & (
            (races[col] < 0.02) | (races[col] > 0.70))

print("Rule-based flags:")
for col in flags.columns:
    n = flags[col].sum()
    if n > 0:
        print(f"  {col}: {n:,}")

# Isolation Forest per distance
print("\\nIsolation Forest per distance...")
iso_cols = ['swim_sec', 'bike_sec', 'run_sec', 'total_sec']
flags['isolation_forest'] = False

for dist in races['event_distance'].dropna().unique():
    subset = races[races['event_distance'] == dist].dropna(subset=iso_cols)
    if len(subset) < 100:
        continue
    X_iso = subset[iso_cols].values
    iso = IsolationForest(contamination=0.01, random_state=42, n_jobs=-1)
    preds = iso.fit_predict(X_iso)
    anomalies = preds == -1
    flags.loc[subset.index[anomalies], 'isolation_forest'] = True
    print(f"  [{dist}] {anomalies.sum():,} anomalies ({100*anomalies.mean():.1f}%)")

# Combined
flags['is_anomaly'] = flags.any(axis=1)
flags['reason'] = flags.apply(
    lambda r: ','.join([c for c in flags.columns if c not in ('is_anomaly','reason') and r[c]]),
    axis=1)
flags['reason'] = flags['reason'].replace('', np.nan)

n_anom = flags['is_anomaly'].sum()
print(f"\\nTotal anomalies: {n_anom:,} ({100*n_anom/len(races):.2f}%)")"""),

md("## 5. Save Outputs"),

code("""# Cluster assignments
cluster_out = df[['athlete_hash', 'cluster_id', 'cluster_name',
                   'gmm_cluster', 'gmm_max_prob']].copy()
if 'hdbscan_cluster' in df.columns:
    cluster_out['hdbscan_cluster'] = df['hdbscan_cluster']
cluster_out.to_csv(CLEANED / 'cluster_assignments.csv', index=False)
centroids.to_csv(CLEANED / 'cluster_centroids.csv', index=False)
print(f"cluster_assignments.csv: {len(cluster_out):,}")

# Pacing archetypes
pac_out = pd.DataFrame({
    'pacing_archetype': all_labels,
    'pacing_confidence': all_probs,
})
pac_out.to_csv(CLEANED / 'pacing_archetypes.csv', index=False)
print(f"pacing_archetypes.csv: {pac_out['pacing_archetype'].notna().sum():,} assigned")

# Anomaly flags
anomaly_out = flags[['is_anomaly', 'reason']]
anomaly_out.to_csv(CLEANED / 'anomaly_flags.csv', index=False)
print(f"anomaly_flags.csv: {flags['is_anomaly'].sum():,} anomalies")

print("\\n✅ UNSUPERVISED COMPLETE")"""),

]

nbf.write(nb, 'research/notebooks/02_unsupervised.ipynb')
print("Created 02_unsupervised.ipynb")
