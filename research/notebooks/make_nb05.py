#!/usr/bin/env python3
"""Generate 05_embeddings.ipynb — combined model (cross-distance similarity) with per-distance eval."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 05 — Neural Embeddings
**RaceDayAI ML Prediction Engine (Plan 07)**

PyTorch MLP embedding network. Multi-task learning: time prediction + split ratios + DNF risk.
"Athletes like you" similarity search via cosine distance in embedding space.

**Why combined (not per-distance)?** The embedding space is designed for cross-distance athlete
similarity — a 70.3 athlete should be able to find comparable 140.6 athletes. Distance is an
input feature (embedding dimension), not a data partition. Per-distance evaluation is reported.

**Reads:** `athlete_race.csv`, `athlete_profile.csv`
**Writes:** `athlete_embeddings.csv`, `neural_predictions.csv`, trained PyTorch model"""),

code("""import pandas as pd
import numpy as np
import warnings
from pathlib import Path
from time import time
warnings.filterwarnings('ignore')

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
print(f"PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}")

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'
DEVICE = 'cpu'

MODEL_DISTANCES = ['70.3', '140.6']"""),

md("## 1. Load & Prepare Data"),

code("""races = pd.read_csv(CLEANED / 'athlete_race.csv', low_memory=False)
profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)

# Filter: AG, valid times, 70.3 + 140.6
df = races[(races['is_pro'] != True) &
           races['event_distance'].isin(MODEL_DISTANCES) &
           races['total_sec'].notna() &
           (races['total_sec'] > 3600) & (races['total_sec'] < 61200)].copy()

for d in MODEL_DISTANCES:
    n = (df['event_distance'] == d).sum()
    print(f"  {d}: {n:,} records")
print(f"Total: {len(df):,}")

# Encode categoricals
gender_map = {'M': 0, 'F': 1}
df['gender_idx'] = df['gender'].map(gender_map).fillna(0).astype(int)
N_GENDER = 2

# Age group
age_groups = sorted(df['age_group'].dropna().unique())
age_map = {a: i for i, a in enumerate(age_groups)}
df['age_idx'] = df['age_group'].map(age_map).fillna(0).astype(int)
N_AGE = len(age_groups)

# Country (top 50, rest = 0)
country_counts = df['country'].value_counts()
top_countries = country_counts.head(50).index.tolist()
country_map = {c: i+1 for i, c in enumerate(top_countries)}
df['country_idx'] = df['country'].map(country_map).fillna(0).astype(int)
N_COUNTRY = len(top_countries) + 1

# Distance (as embedding)
dist_map = {'70.3': 0, '140.6': 1}
df['dist_idx'] = df['event_distance'].map(dist_map).fillna(0).astype(int)
N_DIST = 2

# Continuous features (normalize)
cont_features = ['swim_pct', 'bike_pct', 'run_pct', 'fade_ratio', 'bike_run_ratio']
for col in cont_features:
    if col in df.columns:
        median = df[col].median()
        df[col] = df[col].fillna(median)
    else:
        df[col] = 0.0

# Per-distance normalization for continuous features
# This accounts for different distributions between 70.3 and 140.6
cont_stats = {}
for d in MODEL_DISTANCES:
    mask = df['event_distance'] == d
    cont_stats[d] = {
        'mean': df.loc[mask, cont_features].mean(),
        'std': df.loc[mask, cont_features].std() + 1e-8,
    }

# Normalize using overall stats (since we're training one combined model)
cont_means = df[cont_features].mean()
cont_stds = df[cont_features].std() + 1e-8
for col in cont_features:
    df[f'{col}_norm'] = (df[col] - cont_means[col]) / cont_stds[col]

cont_norm_cols = [f'{c}_norm' for c in cont_features]

# Per-distance target normalization
total_stats = {}
for d in MODEL_DISTANCES:
    mask = df['event_distance'] == d
    total_stats[d] = {'mean': df.loc[mask, 'total_sec'].mean(),
                       'std': df.loc[mask, 'total_sec'].std()}

# Global normalization for the combined model
total_mean = df['total_sec'].mean()
total_std = df['total_sec'].std()
df['total_norm'] = (df['total_sec'] - total_mean) / total_std

# Split ratios as target
# DNF flag (0/1)
df['is_dnf'] = 0.0
if 'finish_status' in df.columns:
    df['is_dnf'] = df['finish_status'].fillna('').str.upper().isin(['DNF', 'DNS', 'DQ']).astype(float)

print(f"Categoricals: gender={N_GENDER}, age={N_AGE}, country={N_COUNTRY}, dist={N_DIST}")
print(f"Continuous features: {len(cont_features)}")
print(f"Targets: total_sec (regression), split_pcts (3-way), is_dnf (binary)")"""),

md("## 2. Dataset & DataLoader"),

code("""class TriathlonDataset(Dataset):
    def __init__(self, df):
        self.gender = torch.LongTensor(df['gender_idx'].values)
        self.age = torch.LongTensor(df['age_idx'].values)
        self.country = torch.LongTensor(df['country_idx'].values)
        self.distance = torch.LongTensor(df['dist_idx'].values)
        self.continuous = torch.FloatTensor(df[cont_norm_cols].values)
        self.total = torch.FloatTensor(df['total_norm'].values)
        self.splits = torch.FloatTensor(df[['swim_pct', 'bike_pct', 'run_pct']].fillna(0.33).values)
        self.dnf = torch.FloatTensor(df['is_dnf'].values)

    def __len__(self):
        return len(self.gender)

    def __getitem__(self, idx):
        return {
            'gender': self.gender[idx],
            'age': self.age[idx],
            'country': self.country[idx],
            'distance': self.distance[idx],
            'continuous': self.continuous[idx],
            'total': self.total[idx],
            'splits': self.splits[idx],
            'dnf': self.dnf[idx],
        }

# Random split (grouped by athlete to prevent leakage)
def random_athlete_split(data, train_frac=0.70, val_frac=0.15, seed=42):
    athletes = data['athlete_hash'].unique()
    rng = np.random.RandomState(seed)
    rng.shuffle(athletes)
    n = len(athletes)
    n_train = int(train_frac * n)
    n_val = int(val_frac * n)
    train_ath = set(athletes[:n_train])
    val_ath = set(athletes[n_train:n_train + n_val])
    test_ath = set(athletes[n_train + n_val:])
    return (data[data['athlete_hash'].isin(train_ath)].copy(),
            data[data['athlete_hash'].isin(val_ath)].copy(),
            data[data['athlete_hash'].isin(test_ath)].copy())

train_df, val_df, test_df = random_athlete_split(df)

train_ds = TriathlonDataset(train_df)
val_ds = TriathlonDataset(val_df)
test_ds = TriathlonDataset(test_df)

train_loader = DataLoader(train_ds, batch_size=256, shuffle=True, num_workers=0)
val_loader = DataLoader(val_ds, batch_size=512, shuffle=False, num_workers=0)
test_loader = DataLoader(test_ds, batch_size=512, shuffle=False, num_workers=0)

print(f"Train: {len(train_ds):,} | Val: {len(val_ds):,} | Test: {len(test_ds):,}")
for d in MODEL_DISTANCES:
    n_tr = (train_df['event_distance'] == d).sum()
    n_te = (test_df['event_distance'] == d).sum()
    print(f"  {d}: train={n_tr:,}  test={n_te:,}")"""),

md("""## 3. Model Architecture

Categorical embeddings + continuous → Dense(128) → Dense(64) → Embedding(32) → 3 task heads.
Distance embedding allows the model to learn distance-specific patterns internally."""),

code("""class AthleteEmbeddingNet(nn.Module):
    def __init__(self, n_gender, n_age, n_country, n_dist, n_cont,
                 emb_dim=32):
        super().__init__()
        # Categorical embeddings
        self.emb_gender = nn.Embedding(n_gender, 4)
        self.emb_age = nn.Embedding(n_age, 8)
        self.emb_country = nn.Embedding(n_country, 16)
        self.emb_dist = nn.Embedding(n_dist, 4)

        # Input dim = sum of embeddings + continuous
        input_dim = 4 + 8 + 16 + 4 + n_cont  # 32 + n_cont

        # Shared backbone
        self.backbone = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, emb_dim),
            nn.ReLU(),
        )

        # Task heads
        self.head_time = nn.Linear(emb_dim, 1)          # total time regression
        self.head_splits = nn.Linear(emb_dim, 3)        # split ratios (softmax)
        self.head_risk = nn.Linear(emb_dim, 1)          # DNF risk (sigmoid)

    def forward(self, gender, age, country, distance, continuous):
        g = self.emb_gender(gender)
        a = self.emb_age(age)
        c = self.emb_country(country)
        d = self.emb_dist(distance)

        x = torch.cat([g, a, c, d, continuous], dim=-1)
        embedding = self.backbone(x)

        time_pred = self.head_time(embedding).squeeze(-1)
        split_pred = torch.softmax(self.head_splits(embedding), dim=-1)
        risk_pred = torch.sigmoid(self.head_risk(embedding)).squeeze(-1)

        return time_pred, split_pred, risk_pred, embedding

model = AthleteEmbeddingNet(N_GENDER, N_AGE, N_COUNTRY, N_DIST, len(cont_features))
total_params = sum(p.numel() for p in model.parameters())
print(f"Model parameters: {total_params:,}")
print(model)"""),

md("## 4. Training Loop"),

code("""# Loss functions
mse_loss = nn.MSELoss()
bce_loss = nn.BCELoss()

# Loss weights
LAMBDA_TIME = 1.0
LAMBDA_SPLITS = 0.5
LAMBDA_RISK = 0.3

optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = optim.lr_scheduler.OneCycleLR(optimizer, max_lr=1e-3,
                                           steps_per_epoch=len(train_loader),
                                           epochs=30)

def train_epoch(model, loader, optimizer, scheduler):
    model.train()
    total_loss = 0
    n = 0
    for batch in loader:
        time_pred, split_pred, risk_pred, _ = model(
            batch['gender'], batch['age'], batch['country'],
            batch['distance'], batch['continuous'])

        loss_time = mse_loss(time_pred, batch['total'])
        log_pred = torch.log(split_pred + 1e-8)
        loss_splits = torch.nn.functional.kl_div(log_pred, batch['splits'],
                                                  reduction='batchmean')
        loss_risk = bce_loss(risk_pred, batch['dnf'])

        loss = LAMBDA_TIME * loss_time + LAMBDA_SPLITS * loss_splits + LAMBDA_RISK * loss_risk

        optimizer.zero_grad()
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item() * len(batch['gender'])
        n += len(batch['gender'])
    return total_loss / n

@torch.no_grad()
def eval_epoch(model, loader):
    model.eval()
    all_preds, all_true = [], []
    total_loss = 0
    n = 0
    for batch in loader:
        time_pred, split_pred, risk_pred, _ = model(
            batch['gender'], batch['age'], batch['country'],
            batch['distance'], batch['continuous'])
        loss_time = mse_loss(time_pred, batch['total'])
        total_loss += loss_time.item() * len(batch['gender'])
        n += len(batch['gender'])
        all_preds.append(time_pred.numpy())
        all_true.append(batch['total'].numpy())
    all_preds = np.concatenate(all_preds)
    all_true = np.concatenate(all_true)
    preds_sec = all_preds * total_std + total_mean
    true_sec = all_true * total_std + total_mean
    mae = np.abs(preds_sec - true_sec).mean()
    return total_loss / n, mae

print("Training...")
best_val_loss = float('inf')
patience = 5
patience_counter = 0

for epoch in range(30):
    t0 = time()
    train_loss = train_epoch(model, train_loader, optimizer, scheduler)
    val_loss, val_mae = eval_epoch(model, val_loader)

    improved = val_loss < best_val_loss
    if improved:
        best_val_loss = val_loss
        patience_counter = 0
        torch.save(model.state_dict(), str(CLEANED / 'embedding_model.pt'))
    else:
        patience_counter += 1

    if (epoch + 1) % 5 == 0 or improved:
        print(f"  Epoch {epoch+1:2d}: train_loss={train_loss:.4f}  val_loss={val_loss:.4f}  "
              f"val_MAE={val_mae/60:.1f}min  {'✓ best' if improved else ''}")

    if patience_counter >= patience:
        print(f"  Early stopping at epoch {epoch+1}")
        break

# Load best model
model.load_state_dict(torch.load(str(CLEANED / 'embedding_model.pt'), weights_only=True))
print("\\nBest model loaded.")"""),

md("## 5. Evaluate on Test Set (Per Distance)"),

code("""from sklearn.metrics import mean_absolute_error, r2_score

# Collect all test predictions
model.eval()
all_preds, all_true, all_embeddings, all_dists = [], [], [], []
with torch.no_grad():
    for batch in test_loader:
        time_pred, _, _, emb = model(
            batch['gender'], batch['age'], batch['country'],
            batch['distance'], batch['continuous'])
        all_preds.append(time_pred.numpy())
        all_true.append(batch['total'].numpy())
        all_embeddings.append(emb.numpy())
        all_dists.append(batch['distance'].numpy())

preds_sec = np.concatenate(all_preds) * total_std + total_mean
true_sec = np.concatenate(all_true) * total_std + total_mean
all_dists_arr = np.concatenate(all_dists)

# Overall
mae = mean_absolute_error(true_sec, preds_sec)
r2 = r2_score(true_sec, preds_sec)
print(f"OVERALL Test — MAE: {mae/60:.1f} min | R²: {r2:.4f}")

# Per-distance evaluation
for d_idx, d_name in enumerate(MODEL_DISTANCES):
    mask = all_dists_arr == d_idx
    if mask.sum() == 0:
        continue
    mae_d = mean_absolute_error(true_sec[mask], preds_sec[mask])
    r2_d = r2_score(true_sec[mask], preds_sec[mask])
    print(f"  {d_name} Test — n={mask.sum():,}  MAE: {mae_d/60:.1f} min  R²: {r2_d:.4f}")"""),

md("""## 6. Generate Embeddings for All Athletes

Process full dataset in batches to extract 32-dim embeddings."""),

code("""print("Generating embeddings for full dataset...")
full_ds = TriathlonDataset(df)
full_loader = DataLoader(full_ds, batch_size=1024, shuffle=False, num_workers=0)

all_embs = []
all_time_preds = []
model.eval()
with torch.no_grad():
    for batch in full_loader:
        time_pred, _, _, emb = model(
            batch['gender'], batch['age'], batch['country'],
            batch['distance'], batch['continuous'])
        all_embs.append(emb.numpy())
        all_time_preds.append(time_pred.numpy())

embeddings = np.concatenate(all_embs, axis=0)
neural_preds_all = np.concatenate(all_time_preds) * total_std + total_mean
print(f"Embedding matrix: {embeddings.shape}")"""),

md("""## 7. "Athletes Like You" — Cross-Distance Similarity

Find similar athletes via cosine similarity in embedding space.
This works across distances — a 70.3 athlete can find comparable 140.6 athletes."""),

code("""from sklearn.metrics.pairwise import cosine_similarity

# Demo: pick one athlete per distance
for d in MODEL_DISTANCES:
    mask = df['event_distance'].values == d
    indices = np.where(mask)[0]
    if len(indices) < 100:
        continue
    demo_idx = indices[42]
    query_emb = embeddings[demo_idx:demo_idx+1]

    # Compare against first 10K records
    sims = cosine_similarity(query_emb, embeddings[:10000])[0]
    top5_idx = np.argsort(sims)[-6:-1][::-1]

    query_row = df.iloc[demo_idx]
    print(f"\\nQuery ({d}): {query_row.get('athlete_name', 'N/A')} | "
          f"{query_row['gender']} {query_row['age_group']} | "
          f"total={query_row['total_sec']/3600:.2f}h")
    print(f"  Top 5 similar athletes:")
    for rank, idx in enumerate(top5_idx, 1):
        row = df.iloc[idx]
        sim = sims[idx]
        print(f"    {rank}. sim={sim:.3f} | {row.get('athlete_name', 'N/A')} | "
              f"{row['gender']} {row['age_group']} | "
              f"total={row['total_sec']/3600:.2f}h | dist={row['event_distance']}")"""),

md("## 8. Save Outputs"),

code("""# Embeddings CSV (full dataset)
emb_cols = [f'emb_{i:02d}' for i in range(embeddings.shape[1])]
emb_df = pd.DataFrame(embeddings, columns=emb_cols)
emb_df.insert(0, 'athlete_hash', df['athlete_hash'].values)
emb_df.insert(1, 'event_distance', df['event_distance'].values)
emb_df.to_csv(CLEANED / 'athlete_embeddings.csv', index=False)
print(f"athlete_embeddings.csv: {len(emb_df):,} rows × {embeddings.shape[1]} dims")

# Neural predictions — save per-distance for consistency with other notebooks
for d in MODEL_DISTANCES:
    mask = df['event_distance'].values == d
    neural_dist = pd.DataFrame({
        'athlete_hash': df.loc[mask, 'athlete_hash'].values if isinstance(mask, pd.Series) else df['athlete_hash'].values[mask],
        'event_distance': d,
        'event_year': df['event_year'].values[mask],
        'total_sec': df['total_sec'].values[mask],
        'neural_pred': neural_preds_all[mask],
    })
    fname = f'neural_predictions_{d}.csv'
    neural_dist.to_csv(CLEANED / fname, index=False)
    print(f"{fname}: {len(neural_dist):,}")

# Also save combined for backward compatibility
neural_all = pd.DataFrame({
    'athlete_hash': df['athlete_hash'].values,
    'event_distance': df['event_distance'].values,
    'total_sec': df['total_sec'].values,
    'neural_pred': neural_preds_all,
})
neural_all.to_csv(CLEANED / 'neural_predictions.csv', index=False)
print(f"neural_predictions.csv: {len(neural_all):,}")

print("\\n✅ NEURAL EMBEDDINGS COMPLETE")"""),

]

nbf.write(nb, 'research/notebooks/05_embeddings.ipynb')
print("Created 05_embeddings.ipynb")
