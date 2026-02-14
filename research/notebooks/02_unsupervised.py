#!/usr/bin/env python3
"""
RaceDayAI Notebook 02 — Unsupervised Learning
==============================================
Athlete clustering, pacing archetypes, UMAP visualization, anomaly detection.

Reads: athlete_race.csv, athlete_profile.csv
Writes: cluster_assignments.csv, pacing_archetypes.csv, anomaly_flags.csv

Usage: python 02_unsupervised.py
"""
import pandas as pd
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

BASE = Path(__file__).resolve().parent.parent
CLEANED = BASE / 'data' / 'cleaned'

# ═══════════════════════════════════════════════════════════════════════
# 1. LOAD DATA
# ═══════════════════════════════════════════════════════════════════════

def load_data():
    print("Loading data...")
    profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
    races = pd.read_csv(CLEANED / 'athlete_race.csv',
                        usecols=['athlete_hash','gender','age_group','event_distance',
                                 'swim_pct','bike_pct','run_pct','fade_ratio',
                                 'bike_run_ratio','is_pro','total_sec',
                                 'swim_sec','bike_sec','run_sec','t1_sec','t2_sec'],
                        low_memory=False)
    print(f"  Profiles: {len(profiles):,} | Races: {len(races):,}")
    return profiles, races

# ═══════════════════════════════════════════════════════════════════════
# 2. ATHLETE CLUSTERING
# ═══════════════════════════════════════════════════════════════════════

CLUSTER_FEATURES = [
    'swim_strength_z', 'bike_strength_z', 'run_strength_z',
    'consistency_cv', 'total_races', 'improvement_slope', 'mean_fade',
]

def prepare_cluster_data(profiles):
    """Filter to AG athletes with enough data for meaningful clustering."""
    df = profiles.copy()
    # Need at least 3 races for reliable stats
    df = df[df['total_races'] >= 3]
    # Drop rows with too many NaNs in cluster features
    valid = df[CLUSTER_FEATURES].notna().sum(axis=1) >= 5
    df = df[valid].copy()
    print(f"  Clusterable athletes (3+ races, sufficient features): {len(df):,}")
    return df

def run_kmeans(X_scaled, k_range=range(5, 21)):
    """K-Means with silhouette sweep."""
    print("\n  K-Means silhouette sweep...")
    results = []
    for k in k_range:
        km = KMeans(n_clusters=k, n_init=10, random_state=42, max_iter=300)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels, sample_size=min(50000, len(X_scaled)))
        ch = calinski_harabasz_score(X_scaled, labels)
        db = davies_bouldin_score(X_scaled, labels)
        results.append({'k': k, 'silhouette': sil, 'calinski_harabasz': ch, 'davies_bouldin': db})
        print(f"    k={k:2d}: sil={sil:.4f} ch={ch:.0f} db={db:.3f}")
    results = pd.DataFrame(results)
    best_k = results.loc[results['silhouette'].idxmax(), 'k']
    print(f"  Best K-Means k={int(best_k)} (silhouette={results['silhouette'].max():.4f})")
    return int(best_k), results

def run_gmm(X_scaled, k_range=range(5, 16)):
    """GMM with BIC selection."""
    print("\n  GMM BIC sweep...")
    results = []
    for k in k_range:
        gmm = GaussianMixture(n_components=k, covariance_type='full',
                              n_init=3, random_state=42, max_iter=200)
        gmm.fit(X_scaled)
        bic = gmm.bic(X_scaled)
        aic = gmm.aic(X_scaled)
        results.append({'k': k, 'bic': bic, 'aic': aic})
        print(f"    k={k:2d}: BIC={bic:.0f} AIC={aic:.0f}")
    results = pd.DataFrame(results)
    best_k = results.loc[results['bic'].idxmin(), 'k']
    print(f"  Best GMM k={int(best_k)} (BIC={results['bic'].min():.0f})")
    return int(best_k), results

def run_hdbscan(X_scaled):
    """HDBSCAN density-based clustering."""
    print("\n  HDBSCAN...")
    try:
        import hdbscan
        clusterer = hdbscan.HDBSCAN(min_cluster_size=500, min_samples=50,
                                     metric='euclidean', cluster_selection_method='eom')
        labels = clusterer.fit_predict(X_scaled)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = (labels == -1).sum()
        print(f"  HDBSCAN: {n_clusters} clusters, {n_noise:,} noise points ({100*n_noise/len(labels):.1f}%)")
        if n_clusters >= 2:
            valid = labels != -1
            sil = silhouette_score(X_scaled[valid], labels[valid],
                                   sample_size=min(50000, valid.sum()))
            print(f"  Silhouette (excl. noise): {sil:.4f}")
        return labels, n_clusters
    except ImportError:
        print("  HDBSCAN not installed, skipping")
        return None, 0

def cluster_athletes(profiles):
    print("\n" + "="*70)
    print("ATHLETE CLUSTERING")
    print("="*70)

    df = prepare_cluster_data(profiles)
    X = df[CLUSTER_FEATURES].copy()
    # Fill remaining NaNs with median
    X = X.fillna(X.median())
    # Clip outliers to 1st/99th percentile
    for col in X.columns:
        lo, hi = X[col].quantile([0.01, 0.99])
        X[col] = X[col].clip(lo, hi)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # --- Run all three methods ---
    best_km_k, km_results = run_kmeans(X_scaled)
    best_gmm_k, gmm_results = run_gmm(X_scaled)
    hdb_labels, hdb_n = run_hdbscan(X_scaled)

    # --- Use best K-Means as primary (most interpretable for named archetypes) ---
    print(f"\n  Using K-Means k={best_km_k} as primary clustering")
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

    # --- Interpret clusters ---
    print("\n  Cluster centroids (K-Means):")
    centroids = pd.DataFrame(km_final.cluster_centers_, columns=CLUSTER_FEATURES)
    centroids['size'] = df['cluster_id'].value_counts().sort_index().values
    centroids['pct'] = 100 * centroids['size'] / centroids['size'].sum()

    # Auto-name clusters based on dominant trait
    names = []
    for i, row in centroids.iterrows():
        traits = []
        if row['swim_strength_z'] > 0.5: traits.append('StrongSwim')
        if row['bike_strength_z'] > 0.5: traits.append('StrongBike')
        if row['run_strength_z'] > 0.5: traits.append('StrongRun')
        if row['swim_strength_z'] < -0.5: traits.append('WeakSwim')
        if row['bike_strength_z'] < -0.5: traits.append('WeakBike')
        if row['run_strength_z'] < -0.5: traits.append('WeakRun')
        if row['total_races'] > centroids['total_races'].median() + 1:
            traits.append('Veteran')
        if row['total_races'] < centroids['total_races'].median() - 1:
            traits.append('Novice')
        if row['mean_fade'] > 1.1: traits.append('Fader')
        if row['improvement_slope'] < -100: traits.append('Improving')
        name = '_'.join(traits[:3]) if traits else f'Cluster_{i}'
        names.append(name)
    centroids['name'] = names

    for i, row in centroids.iterrows():
        print(f"    [{i}] {row['name']:30s} n={int(row['size']):,} ({row['pct']:.1f}%)")

    df['cluster_name'] = df['cluster_id'].map(dict(enumerate(names)))

    # --- UMAP ---
    print("\n  UMAP dimensionality reduction...")
    try:
        from umap import UMAP
        # Subsample for speed
        n_umap = min(100000, len(X_scaled))
        idx = np.random.RandomState(42).choice(len(X_scaled), n_umap, replace=False)
        reducer = UMAP(n_components=2, n_neighbors=30, min_dist=0.3, random_state=42)
        emb_2d = reducer.fit_transform(X_scaled[idx])
        umap_df = pd.DataFrame({
            'athlete_hash': df.iloc[idx]['athlete_hash'].values,
            'umap_x': emb_2d[:, 0], 'umap_y': emb_2d[:, 1],
            'cluster_id': df.iloc[idx]['cluster_id'].values,
        })
        umap_df.to_csv(CLEANED / 'umap_coords.csv', index=False)
        print(f"  Saved UMAP coordinates: {len(umap_df):,} points")
    except ImportError:
        print("  UMAP not installed, skipping visualization")

    return df, centroids

# ═══════════════════════════════════════════════════════════════════════
# 3. PACING ARCHETYPES
# ═══════════════════════════════════════════════════════════════════════

def discover_pacing_archetypes(races):
    print("\n" + "="*70)
    print("PACING ARCHETYPES")
    print("="*70)

    # Filter to finishers with complete pacing data
    pac_cols = ['swim_pct', 'bike_pct', 'run_pct', 'fade_ratio']
    df = races.dropna(subset=pac_cols).copy()
    df = df[df['is_pro'] != True]
    print(f"  Records with complete pacing data: {len(df):,}")

    results_by_dist = {}

    for dist in ['70.3', '140.6']:
        subset = df[df['event_distance'] == dist]
        if len(subset) < 1000:
            print(f"  [{dist}] Too few records ({len(subset)}), skipping")
            continue
        print(f"\n  [{dist}] {len(subset):,} records")

        X = subset[pac_cols].values
        X = np.clip(X, np.percentile(X, 1, axis=0), np.percentile(X, 99, axis=0))
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # GMM with BIC
        best_bic, best_k = np.inf, 4
        for k in range(3, 9):
            gmm = GaussianMixture(n_components=k, covariance_type='full',
                                  n_init=3, random_state=42, max_iter=200)
            gmm.fit(X_scaled)
            bic = gmm.bic(X_scaled)
            if bic < best_bic:
                best_bic, best_k = bic, k
        print(f"    Best GMM components: {best_k}")

        gmm = GaussianMixture(n_components=best_k, covariance_type='full',
                              n_init=5, random_state=42)
        gmm.fit(X_scaled)
        labels = gmm.predict(X_scaled)
        probs = gmm.predict_proba(X_scaled)

        # Interpret archetypes
        for k in range(best_k):
            mask = labels == k
            means = subset.loc[mask, pac_cols].mean()
            med_total = subset.loc[mask, 'total_sec'].median()
            archetype = []
            if means['bike_pct'] > subset['bike_pct'].median() + 0.02:
                archetype.append('AggressiveBike')
            if means['fade_ratio'] > 1.08:
                archetype.append('HeavyFade')
            if means['fade_ratio'] < 0.95:
                archetype.append('StrongRun')
            if means['run_pct'] > subset['run_pct'].median() + 0.02:
                archetype.append('ConservativeBike')
            if not archetype:
                archetype.append('Balanced')
            name = '_'.join(archetype)
            print(f"    [{k}] {name:30s} n={mask.sum():,} "
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

    return all_labels, all_probs

# ═══════════════════════════════════════════════════════════════════════
# 4. ANOMALY DETECTION
# ═══════════════════════════════════════════════════════════════════════

def detect_anomalies(races):
    print("\n" + "="*70)
    print("ANOMALY DETECTION")
    print("="*70)

    df = races.copy()

    # Rule-based flags
    flags = pd.DataFrame(index=df.index)

    # Sum check: total should ≈ swim + bike + run (± t1 + t2)
    computed_sum = df['swim_sec'].fillna(0) + df['bike_sec'].fillna(0) + \
                   df['run_sec'].fillna(0) + df['t1_sec'].fillna(0) + df['t2_sec'].fillna(0)
    has_all = df['swim_sec'].notna() & df['bike_sec'].notna() & df['run_sec'].notna()
    flags['sum_mismatch'] = has_all & ((df['total_sec'] - computed_sum).abs() > 120)

    # Extreme transitions
    flags['extreme_t1'] = df['t1_sec'].notna() & (df['t1_sec'] > 900)
    flags['extreme_t2'] = df['t2_sec'].notna() & (df['t2_sec'] > 900)

    # Impossible split ratios
    for seg in ['swim', 'bike', 'run']:
        col = f'{seg}_pct'
        if col in df.columns:
            flags[f'{seg}_pct_extreme'] = df[col].notna() & (
                (df[col] < 0.02) | (df[col] > 0.70))

    print(f"  Rule-based flags:")
    for col in flags.columns:
        n = flags[col].sum()
        if n > 0:
            print(f"    {col}: {n:,}")

    # Isolation Forest per distance
    print("\n  Isolation Forest per distance...")
    iso_cols = ['swim_sec', 'bike_sec', 'run_sec', 'total_sec']
    flags['isolation_forest'] = False

    for dist in df['event_distance'].dropna().unique():
        subset = df[df['event_distance'] == dist].dropna(subset=iso_cols)
        if len(subset) < 100:
            continue
        X = subset[iso_cols].values
        iso = IsolationForest(contamination=0.01, random_state=42, n_jobs=-1)
        preds = iso.fit_predict(X)
        anomalies = preds == -1
        flags.loc[subset.index[anomalies], 'isolation_forest'] = True
        print(f"    [{dist}] {anomalies.sum():,} anomalies ({100*anomalies.mean():.1f}%)")

    # Combined flag
    flags['is_anomaly'] = flags.any(axis=1)
    flags['reason'] = flags.apply(
        lambda r: ','.join([c for c in flags.columns if c not in ('is_anomaly','reason') and r[c]]),
        axis=1)
    flags['reason'] = flags['reason'].replace('', np.nan)

    n_anom = flags['is_anomaly'].sum()
    print(f"\n  Total anomalies: {n_anom:,} ({100*n_anom/len(df):.2f}%)")
    return flags

# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    t0 = time()
    print("="*70)
    print("  RACEDAYAI — UNSUPERVISED LEARNING (Plan 07, Notebook 02)")
    print("="*70)

    profiles, races = load_data()

    # 1. Athlete clustering
    cluster_df, centroids = cluster_athletes(profiles)
    cluster_out = cluster_df[['athlete_hash', 'cluster_id', 'cluster_name',
                               'gmm_cluster', 'gmm_max_prob']].copy()
    if 'hdbscan_cluster' in cluster_df.columns:
        cluster_out['hdbscan_cluster'] = cluster_df['hdbscan_cluster']
    cluster_out.to_csv(CLEANED / 'cluster_assignments.csv', index=False)
    centroids.to_csv(CLEANED / 'cluster_centroids.csv', index=False)
    print(f"\n  ✅ cluster_assignments.csv: {len(cluster_out):,}")

    # 2. Pacing archetypes
    pac_labels, pac_probs = discover_pacing_archetypes(races)
    pac_out = pd.DataFrame({
        'pacing_archetype': pac_labels,
        'pacing_confidence': pac_probs,
    })
    pac_out.to_csv(CLEANED / 'pacing_archetypes.csv', index=False)
    print(f"  ✅ pacing_archetypes.csv: {pac_out['pacing_archetype'].notna().sum():,} assigned")

    # 3. Anomaly detection
    anomaly_flags = detect_anomalies(races)
    anomaly_flags[['is_anomaly', 'reason']].to_csv(CLEANED / 'anomaly_flags.csv', index=False)
    print(f"  ✅ anomaly_flags.csv: {anomaly_flags['is_anomaly'].sum():,} anomalies")

    elapsed = time() - t0
    print(f"\n{'='*70}")
    print(f"  ✅ UNSUPERVISED COMPLETE ({elapsed:.0f}s)")
    print(f"{'='*70}")

if __name__ == '__main__':
    main()
