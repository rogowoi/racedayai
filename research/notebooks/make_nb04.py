#!/usr/bin/env python3
"""Generate 04_bayesian.ipynb — per-distance Bayesian hierarchical models."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 04 — Bayesian Hierarchical Model (Per-Distance)
**RaceDayAI ML Prediction Engine (Plan 07)**

Separate NumPyro hierarchical models for 70.3 and 140.6. Partial pooling within each distance
over gender/age/cluster groups. Principled uncertainty quantification with credible intervals.

**Reads:** `athlete_race.csv`, `athlete_profile.csv`, `cluster_assignments.csv`
**Writes:** `bayesian_predictions_70.3.csv`, `bayesian_predictions_140.6.csv`, `bayesian_posterior_means.csv`"""),

code("""import pandas as pd
import numpy as np
import warnings
from pathlib import Path
from time import time
warnings.filterwarnings('ignore')

import jax
import jax.numpy as jnp
import numpyro
import numpyro.distributions as dist
from numpyro.infer import MCMC, NUTS, Predictive

numpyro.set_host_device_count(1)  # CPU only
print(f"JAX devices: {jax.devices()}")
print(f"NumPyro version: {numpyro.__version__}")

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'

MODEL_DISTANCES = ['70.3', '140.6']"""),

md("## 1. Load & Prepare Data"),

code("""races = pd.read_csv(CLEANED / 'athlete_race.csv', low_memory=False)
profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
clusters = pd.read_csv(CLEANED / 'cluster_assignments.csv', low_memory=False)

# Merge
pcols = ['athlete_hash', 'total_races', 'pb_total_sec', 'consistency_cv', 'improvement_slope']
pcols = [c for c in pcols if c in profiles.columns]
df = races.merge(profiles[pcols], on='athlete_hash', how='left')
ccols = ['athlete_hash', 'cluster_id']
ccols = [c for c in ccols if c in clusters.columns]
df = df.merge(clusters[ccols], on='athlete_hash', how='left')

# Filter: AG, valid times, 70.3 + 140.6
df = df[(df['is_pro'] != True) &
        df['event_distance'].isin(MODEL_DISTANCES) &
        df['total_sec'].notna() &
        (df['total_sec'] > 3600) & (df['total_sec'] < 61200)].copy()

for d in MODEL_DISTANCES:
    n = (df['event_distance'] == d).sum()
    print(f"  {d}: {n:,} records")
print(f"Total for Bayesian: {len(df):,}")"""),

md("""## 2. Define Hierarchical Model

Partial pooling: global mean + gender/age/cluster offsets + fitness/experience coefficients.
No distance parameter — we train separate models per distance."""),

code("""def build_hierarchical_model(n_gender, n_age, n_cluster):
    def model(gender_idx, age_idx, cluster_idx, fitness, experience, y=None):
        # Global intercept
        mu_global = numpyro.sample('mu_global', dist.Normal(0.0, 1.0))

        # Group-level effects (partial pooling)
        sigma_gender = numpyro.sample('sigma_gender', dist.HalfNormal(0.5))
        mu_gender = numpyro.sample('mu_gender', dist.Normal(0, sigma_gender).expand([n_gender]))

        sigma_age = numpyro.sample('sigma_age', dist.HalfNormal(0.5))
        mu_age = numpyro.sample('mu_age', dist.Normal(0, sigma_age).expand([n_age]))

        sigma_cluster = numpyro.sample('sigma_cluster', dist.HalfNormal(0.5))
        mu_cluster = numpyro.sample('mu_cluster', dist.Normal(0, sigma_cluster).expand([n_cluster]))

        # Continuous coefficients
        beta_fitness = numpyro.sample('beta_fitness', dist.Normal(0.3, 0.2))
        beta_experience = numpyro.sample('beta_experience', dist.Normal(-0.1, 0.1))

        # Individual-level noise
        sigma = numpyro.sample('sigma', dist.HalfNormal(1.0))

        # Linear predictor
        mu = (mu_global
              + mu_gender[gender_idx]
              + mu_age[age_idx]
              + mu_cluster[cluster_idx]
              + beta_fitness * fitness
              + beta_experience * experience)

        # Likelihood
        numpyro.sample('obs', dist.Normal(mu, sigma), obs=y)

    return model

print("Model builder defined.")"""),

md("## 3. Per-Distance MCMC"),

code("""# Store results per distance
bayes_results = {}

for DIST in MODEL_DISTANCES:
    print(f"\\n{'='*70}")
    print(f"  BAYESIAN MODEL: {DIST}")
    print(f"{'='*70}")

    dist_df = df[df['event_distance'] == DIST].copy()
    print(f"  Total records: {len(dist_df):,}")

    # Subsample for tractable MCMC
    N_SAMPLE = min(50000, len(dist_df))
    sample = dist_df.sample(N_SAMPLE, random_state=42).copy()
    print(f"  Subsampled to: {N_SAMPLE:,}")

    # Encode groups
    gender_map = {'M': 0, 'F': 1}
    sample['gender_idx'] = sample['gender'].map(gender_map).fillna(0).astype(int)
    N_GENDER = 2

    age_bands = sorted(sample['age_group'].dropna().unique())
    age_map = {a: i for i, a in enumerate(age_bands)}
    sample['age_idx'] = sample['age_group'].map(age_map).fillna(0).astype(int)
    N_AGE = len(age_bands)

    sample['cluster_id'] = sample['cluster_id'].fillna(-1).astype(int)
    cluster_vals = sorted(sample['cluster_id'].unique())
    cluster_map = {c: i for i, c in enumerate(cluster_vals)}
    sample['cluster_idx'] = sample['cluster_id'].map(cluster_map).astype(int)
    N_CLUSTER = len(cluster_vals)

    # Continuous features (standardize)
    dist_mean = sample['total_sec'].mean()
    dist_std = sample['total_sec'].std()
    sample['fitness'] = (sample['pb_total_sec'].fillna(dist_mean) - dist_mean) / dist_std
    sample['experience'] = np.log1p(sample['total_races'].fillna(0))
    exp_mean_s = sample['experience'].mean()
    exp_std_s = sample['experience'].std() + 1e-8
    sample['experience'] = (sample['experience'] - exp_mean_s) / exp_std_s

    # Standardized target
    sample['y_std'] = (sample['total_sec'] - dist_mean) / dist_std

    print(f"  Groups: {N_GENDER} genders, {N_AGE} age, {N_CLUSTER} clusters")
    print(f"  Target: mean={dist_mean:.0f}s  std={dist_std:.0f}s")

    # Build model
    model_fn = build_hierarchical_model(N_GENDER, N_AGE, N_CLUSTER)

    # JAX arrays
    data = {
        'gender_idx': jnp.array(sample['gender_idx'].values),
        'age_idx': jnp.array(sample['age_idx'].values),
        'cluster_idx': jnp.array(sample['cluster_idx'].values),
        'fitness': jnp.array(sample['fitness'].values),
        'experience': jnp.array(sample['experience'].values),
        'y': jnp.array(sample['y_std'].values),
    }

    # Run NUTS
    print(f"  Running NUTS: 1500 warmup + 1500 samples × 2 chains ...")
    t0 = time()
    kernel = NUTS(model_fn, target_accept_prob=0.85)
    mcmc = MCMC(kernel, num_warmup=1500, num_samples=1500, num_chains=2, progress_bar=True)
    mcmc.run(jax.random.PRNGKey(42 if DIST == '70.3' else 99), **data)
    elapsed = time() - t0
    print(f"  MCMC completed in {elapsed:.0f}s")
    mcmc.print_summary(exclude_deterministic=False)

    posterior = mcmc.get_samples()

    # Store everything needed for prediction
    bayes_results[DIST] = {
        'posterior': posterior,
        'dist_mean': dist_mean,
        'dist_std': dist_std,
        'gender_map': gender_map,
        'age_map': age_map,
        'cluster_map': cluster_map,
        'exp_mean': exp_mean_s,
        'exp_std': exp_std_s,
        'default_cluster_idx': sample['cluster_idx'].mode().values[0],
        'sample': sample,
        'data': data,
    }"""),

md("## 4. Posterior Analysis (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in bayes_results:
        continue
    print(f"\\n--- Posterior Analysis: {DIST} ---")
    r = bayes_results[DIST]
    posterior = r['posterior']
    y_std = r['dist_std']

    # Gender effects
    print("  Gender effects (in seconds):")
    for g, name in enumerate(['Male', 'Female']):
        vals = np.array(posterior['mu_gender'][:, g]) * y_std
        print(f"    {name}: mean={vals.mean():.0f}s  [{np.percentile(vals, 2.5):.0f}, {np.percentile(vals, 97.5):.0f}]")

    # Coefficients
    for param in ['beta_fitness', 'beta_experience', 'sigma']:
        vals = np.array(posterior[param])
        print(f"  {param}: mean={vals.mean():.3f}  std={vals.std():.3f}  "
              f"[{np.percentile(vals, 2.5):.3f}, {np.percentile(vals, 97.5):.3f}]")"""),

md("## 5. Posterior Predictive Checks (Per Distance)"),

code("""from sklearn.metrics import mean_absolute_error, r2_score

for DIST in MODEL_DISTANCES:
    if DIST not in bayes_results:
        continue
    print(f"\\n--- Posterior Predictive: {DIST} ---")
    r = bayes_results[DIST]
    posterior = r['posterior']
    data_noobs = {k: v for k, v in r['data'].items() if k != 'y'}

    model_fn = build_hierarchical_model(2, len(r['age_map']), len(r['cluster_map']))
    predictive = Predictive(model_fn, posterior)
    pred_samples = predictive(jax.random.PRNGKey(1), **data_noobs)

    pred_obs = np.array(pred_samples['obs']) * r['dist_std'] + r['dist_mean']
    pred_mean = pred_obs.mean(axis=0)
    pred_std = pred_obs.std(axis=0)
    pred_p05 = np.percentile(pred_obs, 5, axis=0)
    pred_p95 = np.percentile(pred_obs, 95, axis=0)

    y_actual = r['sample']['total_sec'].values
    mae = mean_absolute_error(y_actual, pred_mean)
    r2 = r2_score(y_actual, pred_mean)
    coverage_90 = ((y_actual >= pred_p05) & (y_actual <= pred_p95)).mean()

    print(f"  MAE: {mae/60:.1f} min ({mae:.0f} sec)")
    print(f"  R²:  {r2:.4f}")
    print(f"  90% CI coverage: {coverage_90:.3f} (target: 0.90)")
    print(f"  Mean prediction std: {pred_std.mean()/60:.1f} min")"""),

md("## 6. Generate Predictions for Full Dataset (Per Distance)"),

code("""for DIST in MODEL_DISTANCES:
    if DIST not in bayes_results:
        continue
    print(f"\\n--- Full predictions: {DIST} ---")
    r = bayes_results[DIST]
    posterior = r['posterior']
    pm = {k: np.array(v).mean(axis=0) for k, v in posterior.items()}

    full_dist = df[df['event_distance'] == DIST].copy()

    # Encode
    full_dist['gender_idx'] = full_dist['gender'].map(r['gender_map']).fillna(0).astype(int)
    full_dist['age_idx'] = full_dist['age_group'].map(r['age_map']).fillna(0).astype(int)
    full_dist['cluster_id_clean'] = full_dist['cluster_id'].fillna(-1).astype(int)
    full_dist['cluster_idx'] = full_dist['cluster_id_clean'].map(r['cluster_map'])
    full_dist['cluster_idx'] = full_dist['cluster_idx'].fillna(r['default_cluster_idx']).astype(int)

    full_dist['fitness'] = (full_dist['pb_total_sec'].fillna(r['dist_mean']) - r['dist_mean']) / r['dist_std']
    full_dist['experience'] = np.log1p(full_dist['total_races'].fillna(0))
    full_dist['experience'] = (full_dist['experience'] - r['exp_mean']) / r['exp_std']

    # Posterior-mean prediction
    mu_pred = (pm['mu_global']
               + pm['mu_gender'][full_dist['gender_idx'].values]
               + pm['mu_age'][full_dist['age_idx'].values]
               + pm['mu_cluster'][full_dist['cluster_idx'].values]
               + pm['beta_fitness'] * full_dist['fitness'].values
               + pm['beta_experience'] * full_dist['experience'].values)

    full_dist['bayes_pred'] = mu_pred * r['dist_std'] + r['dist_mean']
    full_dist['bayes_std'] = float(pm['sigma']) * r['dist_std']

    print(f"  Predictions: {len(full_dist):,}")
    print(f"  Mean prediction: {full_dist['bayes_pred'].mean()/3600:.2f}h")
    print(f"  Mean uncertainty (1σ): {full_dist['bayes_std'].mean()/60:.1f}min")

    # Save
    out = full_dist[['athlete_hash', 'event_distance', 'event_year', 'total_sec',
                      'bayes_pred', 'bayes_std']].copy()
    fname = f'bayesian_predictions_{DIST}.csv'
    out.to_csv(CLEANED / fname, index=False)
    print(f"  → {fname}: {len(out):,}")"""),

md("## 7. Save Posterior Summary"),

code("""# Combined posterior parameter means
all_params = []
for DIST in MODEL_DISTANCES:
    if DIST not in bayes_results:
        continue
    posterior = bayes_results[DIST]['posterior']
    row = {'distance': DIST}
    for k, v in posterior.items():
        arr = np.array(v)
        if arr.ndim == 1:
            row[k] = arr.mean()
        else:
            for i in range(arr.shape[1]):
                row[f'{k}_{i}'] = arr[:, i].mean()
    all_params.append(row)

params_df = pd.DataFrame(all_params)
params_df.to_csv(CLEANED / 'bayesian_posterior_means.csv', index=False)
print(f"bayesian_posterior_means.csv: {len(params_df)} rows × {params_df.shape[1]} cols")

print("\\n✅ BAYESIAN MODEL COMPLETE (per-distance)")"""),

]

nbf.write(nb, 'research/notebooks/04_bayesian.ipynb')
print("Created 04_bayesian.ipynb")
