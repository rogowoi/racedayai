#!/usr/bin/env python3
"""
RaceDayAI ETL Pipeline — Plan 07
=================================
Processes 5 triathlon data sources into unified CSVs.

Outputs:
  research/data/cleaned/athlete_race.csv    — unified race records + derived features
  research/data/cleaned/athlete_profile.csv — per-athlete aggregated profiles
  research/data/cleaned/cohort_stats.csv    — per-cohort summary statistics

Usage: python run_etl.py   (needs ~6GB RAM; run outside VM if needed)
"""
import pandas as pd
import numpy as np
import hashlib, json, glob, gc, re, warnings
from pathlib import Path
from time import time

warnings.filterwarnings('ignore')

# ── Paths ──────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
SCRAPED = BASE / 'data' / 'scraped'
CLEANED = BASE / 'data' / 'cleaned'
CLEANED.mkdir(parents=True, exist_ok=True)

# ── Unified schema ─────────────────────────────────────────────────────
SCHEMA = [
    'athlete_hash','athlete_name','gender','age_group','age_band',
    'country','country_iso2','is_pro',
    'event_name','event_year','event_location','event_distance','source',
    'swim_sec','t1_sec','bike_sec','t2_sec','run_sec','total_sec',
    'overall_rank','gender_rank','age_group_rank','division_rank','finish_status',
]
DERIVED = ['swim_pct','bike_pct','run_pct','transition_pct',
           'bike_run_ratio','fade_ratio','implied_bike_if','cohort_percentile']

# ── Quality bounds (Plan 07 Appendix A) ────────────────────────────────
B = dict(swim=(300,9000), bike=(1800,36000), run=(600,25200),
         total=(3300,68400), t=(0,1200), pct=(0.05,0.65))

# ═══════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════

def hms_to_sec(series):
    """Vectorized HH:MM:SS → seconds. Handles H:M:S, M:S, and numeric."""
    s = series.astype(str).str.strip()
    bad = s.isin(['','0:00','00:00','0:00:00','00:00:00','--','DNS','DNF','DQ',
                  'nan','None','NaN','<NA>'])
    result = pd.Series(np.nan, index=series.index)
    valid = ~bad & series.notna()
    if not valid.any():
        return result
    sv = s[valid]
    nc = sv.str.count(':')

    m3 = nc == 2
    if m3.any():
        idx = m3[m3].index
        p = sv[idx].str.split(':', expand=True)
        result.loc[idx] = (pd.to_numeric(p[0], errors='coerce') * 3600 +
                           pd.to_numeric(p[1], errors='coerce') * 60 +
                           pd.to_numeric(p[2], errors='coerce'))
    m2 = nc == 1
    if m2.any():
        idx = m2[m2].index
        p = sv[idx].str.split(':', expand=True)
        result.loc[idx] = (pd.to_numeric(p[0], errors='coerce') * 60 +
                           pd.to_numeric(p[1], errors='coerce'))
    m1 = nc == 0
    if m1.any():
        idx = m1[m1].index
        result.loc[idx] = pd.to_numeric(sv[idx], errors='coerce')
    return result

def norm_gender(series):
    s = series.astype(str).str.strip().str.upper()
    r = pd.Series(np.nan, index=series.index, dtype='object')
    r[s.isin(['M','MALE'])] = 'M'
    r[s.isin(['F','FEMALE'])] = 'F'
    return r

def extract_ag(series):
    s = series.astype(str)
    ag = s.str.extract(r'(\d{2,3}-\d{2,3})', expand=False)
    plus = s.str.extract(r'(\d{2,3}\+)', expand=False)
    return ag.fillna(plus)

def extract_band(ag):
    return pd.to_numeric(ag.str.extract(r'(\d{2,3})', expand=False), errors='coerce')

def hash_athletes(names, countries, genders):
    n = names.fillna('').astype(str).str.strip().str.lower()
    c = countries.fillna('').astype(str).str.strip().str.lower()
    g = genders.fillna('').astype(str).str.strip().str.upper()
    keys = n + '|' + c + '|' + g
    has_name = n.str.len() > 0
    result = pd.Series(None, index=names.index, dtype='object')
    if has_name.any():
        result[has_name] = keys[has_name].apply(
            lambda k: hashlib.sha256(k.encode()).hexdigest()[:16])
    return result

def quality_filter(df, label=""):
    n0 = len(df)
    m = pd.Series(True, index=df.index)
    if 'total_sec' in df.columns:
        m &= df['total_sec'].between(*B['total'])
    for seg in ['swim','bike','run']:
        col = f'{seg}_sec'
        if col in df.columns:
            m &= ~(df[col].notna() & ~df[col].between(*B[seg]))
    for col in ['t1_sec','t2_sec']:
        if col in df.columns:
            m &= ~(df[col].notna() & ~df[col].between(*B['t']))
    if 'total_sec' in df.columns:
        for seg in ['swim','bike','run']:
            col = f'{seg}_sec'
            if col in df.columns:
                pct = df[col] / df['total_sec']
                m &= ~(pct.notna() & ~pct.between(*B['pct']))
    out = df[m].copy()
    print(f"  [{label}] Quality: {n0:,} → {len(out):,} (-{n0-len(out):,})")
    return out

def ensure_schema(df):
    for c in SCHEMA:
        if c not in df.columns:
            df[c] = np.nan
    return df[SCHEMA].copy()

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: SOURCE PROCESSORS
# ═══════════════════════════════════════════════════════════════════════

def process_t100():
    print("\n── T100 ──")
    files = sorted(glob.glob(str(SCRAPED / 't100' / '*.csv')))
    if not files:
        print("  No files"); return pd.DataFrame(columns=SCHEMA)
    t = pd.concat([pd.read_csv(f) for f in files], ignore_index=True)
    print(f"  Loaded: {len(t):,} from {len(files)} files")
    df = pd.DataFrame({
        'athlete_name': t['athlete_name'],
        'gender': t.get('gender', pd.Series(dtype=str)),
        'age_group': t.get('age_group', pd.Series(dtype=str)),
        'country': t.get('country', pd.Series(dtype=str)),
        'is_pro': True,
        'event_name': t['event_name'],
        'event_year': pd.to_numeric(t['event_year'], errors='coerce'),
        'event_location': t['event_name'].str.replace(' T100','',regex=False),
        'event_distance': t.get('event_distance', pd.Series(dtype=str)),
        'source': 't100',
        'swim_sec': pd.to_numeric(t['swim_sec'], errors='coerce'),
        't1_sec': pd.to_numeric(t['t1_sec'], errors='coerce'),
        'bike_sec': pd.to_numeric(t['bike_sec'], errors='coerce'),
        't2_sec': pd.to_numeric(t['t2_sec'], errors='coerce'),
        'run_sec': pd.to_numeric(t['run_sec'], errors='coerce'),
        'total_sec': pd.to_numeric(t['total_sec'], errors='coerce'),
        'overall_rank': pd.to_numeric(t.get('overall_rank'), errors='coerce'),
        'gender_rank': pd.to_numeric(t.get('gender_rank'), errors='coerce'),
        'age_group_rank': pd.to_numeric(t.get('age_group_rank'), errors='coerce'),
        'finish_status': 'finisher',
    })
    df['athlete_hash'] = hash_athletes(df['athlete_name'], df['country'], df['gender'])
    df = df.dropna(subset=['total_sec'])
    df = quality_filter(df, 't100')
    return ensure_schema(df)

def process_wiki():
    print("\n── Wikipedia ──")
    files = sorted(glob.glob(str(SCRAPED / 'wiki' / '*.json')))
    recs = []
    for f in files:
        try:
            with open(f) as fh:
                recs.extend(json.load(fh).get('records', []))
        except: pass
    if not recs:
        print("  No records"); return pd.DataFrame(columns=SCHEMA)
    w = pd.DataFrame(recs)
    w = w[w['athlete_name'].astype(str).str.strip().str.len() > 0]
    w = w.dropna(subset=['total_sec'])
    print(f"  Loaded: {len(w):,} from {len(files)} files")
    df = pd.DataFrame({
        'athlete_name': w['athlete_name'],
        'gender': norm_gender(w.get('gender', pd.Series(np.nan, index=w.index))),
        'age_group': w.get('age_group', pd.Series(dtype=str)),
        'country': w.get('country', pd.Series(dtype=str)),
        'is_pro': True,
        'event_name': w.get('event_name'),
        'event_year': pd.to_numeric(w.get('event_year'), errors='coerce'),
        'event_location': w.get('event_name'),
        'event_distance': w.get('event_distance'),
        'source': 'wiki',
        'swim_sec': pd.to_numeric(w.get('swim_sec'), errors='coerce'),
        't1_sec': pd.to_numeric(w.get('t1_sec'), errors='coerce'),
        'bike_sec': pd.to_numeric(w.get('bike_sec'), errors='coerce'),
        't2_sec': pd.to_numeric(w.get('t2_sec'), errors='coerce'),
        'run_sec': pd.to_numeric(w.get('run_sec'), errors='coerce'),
        'total_sec': pd.to_numeric(w.get('total_sec'), errors='coerce'),
        'overall_rank': pd.to_numeric(w.get('overall_rank'), errors='coerce'),
        'gender_rank': pd.to_numeric(w.get('gender_rank'), errors='coerce'),
        'age_group_rank': pd.to_numeric(w.get('age_group_rank'), errors='coerce'),
        'finish_status': 'finisher',
    })
    df['athlete_hash'] = hash_athletes(df['athlete_name'], df['country'], df['gender'])
    df = quality_filter(df, 'wiki')
    return ensure_schema(df)

def process_df6():
    print("\n── df6 (Half-Ironman) ──")
    raw = pd.read_csv(SCRAPED / 'kaggle' / 'Half_Ironman_df6.csv')
    print(f"  Loaded: {len(raw):,}")
    df = pd.DataFrame({
        'athlete_hash': np.nan, 'athlete_name': np.nan,
        'gender': raw['Gender'], 'age_group': raw['AgeGroup'],
        'age_band': raw['AgeBand'].astype(float),
        'country': raw['Country'], 'country_iso2': raw['CountryISO2'],
        'is_pro': False,
        'event_name': 'Ironman 70.3 ' + raw['EventLocation'].astype(str),
        'event_year': raw['EventYear'],
        'event_location': raw['EventLocation'],
        'event_distance': '70.3', 'source': 'kaggle_df6',
        'swim_sec': pd.to_numeric(raw['SwimTime'], errors='coerce'),
        't1_sec': pd.to_numeric(raw['Transition1Time'], errors='coerce'),
        'bike_sec': pd.to_numeric(raw['BikeTime'], errors='coerce'),
        't2_sec': pd.to_numeric(raw['Transition2Time'], errors='coerce'),
        'run_sec': pd.to_numeric(raw['RunTime'], errors='coerce'),
        'total_sec': pd.to_numeric(raw['FinishTime'], errors='coerce'),
        'finish_status': 'finisher',
    })
    del raw; gc.collect()
    df = df.dropna(subset=['total_sec'])
    df = quality_filter(df, 'df6')
    return ensure_schema(df)

def process_coachcox():
    print("\n── CoachCox ──")
    raw = pd.read_csv(SCRAPED / 'kaggle' / 'results.csv', low_memory=False)
    races = pd.read_csv(SCRAPED / 'kaggle' / 'races.csv')
    series = pd.read_csv(SCRAPED / 'kaggle' / 'series.csv')
    print(f"  Loaded: {len(raw):,} results, {len(races):,} races")

    races_e = races.merge(series, left_on='seriesID', right_on='id', suffixes=('_r','_s'))
    raw = raw.merge(races_e[['id_r','year','location']], left_on='raceID', right_on='id_r', how='left')
    del races, series, races_e; gc.collect()

    for src, dst in [('swimTime','swim_sec'),('bikeTime','bike_sec'),
                     ('runTime','run_sec'),('overallTime','total_sec')]:
        raw[dst] = hms_to_sec(raw[src])

    raw = raw.dropna(subset=['total_sec'])
    raw['_pro'] = raw['Division'].str.upper().isin(['MPRO','FPRO'])

    df = pd.DataFrame({
        'athlete_name': raw['Name'],
        'gender': norm_gender(raw['Gender']),
        'age_group': extract_ag(raw['Division']),
        'age_band': extract_band(extract_ag(raw['Division'])),
        'country': raw['Country'], 'is_pro': raw['_pro'],
        'event_name': raw['location'], 'event_year': raw['year'],
        'event_location': raw['location'], 'event_distance': '140.6',
        'source': 'coachcox',
        'swim_sec': raw['swim_sec'], 'bike_sec': raw['bike_sec'],
        'run_sec': raw['run_sec'], 'total_sec': raw['total_sec'],
        'overall_rank': pd.to_numeric(raw['overallRank'], errors='coerce'),
        'division_rank': pd.to_numeric(raw['divisionRank'], errors='coerce'),
        'finish_status': raw['finishStatus'].str.lower().str.strip(),
    })
    del raw; gc.collect()

    df['athlete_hash'] = hash_athletes(df['athlete_name'], df['country'], df['gender'])
    fin = quality_filter(df[df['finish_status']=='finisher'], 'cc_fin')
    nonfin = df[df['finish_status']!='finisher'].copy()
    print(f"  Non-finishers kept: {len(nonfin):,}")
    df = pd.concat([fin, nonfin], ignore_index=True)
    del fin, nonfin; gc.collect()
    return ensure_schema(df)

def process_tristat():
    print("\n── TriStat ──")
    path = SCRAPED / 'kaggle' / 'postgres_public_tristat_stat.csv'
    raw = pd.read_csv(path, low_memory=False)
    print(f"  Loaded: {len(raw):,}")

    t0 = time()
    for src, dst in [('person_event_swim_time_text','swim_sec'),
                     ('person_event_t1_time_text','t1_sec'),
                     ('person_event_cycle_time_text','bike_sec'),
                     ('person_event_t2_time_text','t2_sec'),
                     ('person_event_run_time_text','run_sec'),
                     ('person_event_finish_time_text','total_sec')]:
        raw[dst] = hms_to_sec(raw[src])
    print(f"  Time conversion: {time()-t0:.1f}s")

    raw = raw.dropna(subset=['total_sec'])
    print(f"  After dropping null total: {len(raw):,}")

    # Parse event_link
    links = raw['event_link'].fillna('').str.lower()
    dist = pd.Series('140.6', index=raw.index)
    dist[links.str.contains('/half/|/70\\.3/', regex=True)] = '70.3'
    dist[links.str.contains('/sprint/')] = 'sprint'
    dist[links.str.contains('/olympic/')] = 'olympic'

    year = pd.to_numeric(
        links.str.extract(r'/(\d{4})(?:/|$)', expand=False), errors='coerce')

    loc = links.str.extract(
        r'/ironman/(?!70\.3|full|half|sprint|olympic)([a-z][a-z0-9-]+)', expand=False)
    loc2 = links.str.extract(
        r'/ironman/(?:70\.3|full|half|sprint|olympic)/([a-z][a-z0-9-]+)', expand=False)
    loc = loc.fillna(loc2).str.replace('-',' ',regex=False).str.title()

    is_pro = raw['person_event_group'].str.upper().str.contains('PRO', na=False)
    gender = norm_gender(raw['gender'])
    backup_g = raw['person_event_group'].str.extract(r'^([MF])', expand=False)
    gender = gender.fillna(backup_g)

    df = pd.DataFrame({
        'athlete_name': raw['person_name'],
        'gender': gender,
        'age_group': extract_ag(raw['person_event_group']),
        'age_band': extract_band(extract_ag(raw['person_event_group'])),
        'country': raw['person_flag'], 'country_iso2': raw['person_flag'],
        'is_pro': is_pro,
        'event_name': 'Ironman ' + dist + ' ' + loc.fillna(''),
        'event_year': year, 'event_location': loc,
        'event_distance': dist, 'source': 'tristat',
        'swim_sec': raw['swim_sec'], 't1_sec': raw['t1_sec'],
        'bike_sec': raw['bike_sec'], 't2_sec': raw['t2_sec'],
        'run_sec': raw['run_sec'], 'total_sec': raw['total_sec'],
        'finish_status': 'finisher',
    })
    del raw; gc.collect()

    df['athlete_hash'] = hash_athletes(df['athlete_name'], df['country'], df['gender'])
    df = quality_filter(df, 'tristat')
    return ensure_schema(df)

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: COMBINE & DERIVED FEATURES
# ═══════════════════════════════════════════════════════════════════════

def combine_and_derive(sources):
    print("\n" + "="*70)
    print("STEP 2: COMBINING & DERIVED FEATURES")
    print("="*70)

    df = pd.concat(sources, ignore_index=True)
    del sources; gc.collect()
    print(f"  Combined: {len(df):,}")
    print(f"  Sources: {df['source'].value_counts().to_dict()}")

    # Dedup
    n = len(df)
    dedup = ['source','athlete_name','event_year','total_sec','gender']
    df.drop_duplicates(subset=dedup, keep='first', inplace=True)
    print(f"  Dedup: {n:,} → {len(df):,}")

    # Row-level features
    print("  Row-level features...")
    tot = df['total_sec']
    for seg in ['swim','bike','run']:
        c = f'{seg}_sec'
        df[f'{seg}_pct'] = np.where((tot>0)&df[c].notna(), df[c]/tot, np.nan)
    df['transition_pct'] = np.where(
        (tot>0)&df['t1_sec'].notna()&df['t2_sec'].notna(),
        (df['t1_sec']+df['t2_sec'])/tot, np.nan)
    df['bike_run_ratio'] = np.where(
        (df['run_sec']>0)&df['bike_sec'].notna(), df['bike_sec']/df['run_sec'], np.nan)

    # Cohort stats (AG only, min 30)
    print("  Cohort statistics...")
    gc_cols = ['gender','age_group','event_distance']
    ag = df[df['is_pro']!=True]
    cohort = ag.groupby(gc_cols).agg(
        c_med_total=('total_sec','median'), c_std_total=('total_sec','std'),
        c_med_swim=('swim_sec','median'), c_med_bike=('bike_sec','median'),
        c_med_run=('run_sec','median'), c_count=('total_sec','count'),
    ).reset_index()
    cohort = cohort[cohort['c_count']>=30]
    print(f"  Valid cohorts (n≥30): {len(cohort):,}")

    df = df.merge(cohort, on=gc_cols, how='left')

    df['fade_ratio'] = np.where(
        (df['c_med_run']>0)&df['run_sec'].notna(), df['run_sec']/df['c_med_run'], np.nan)
    df['implied_bike_if'] = np.where(
        (df['c_med_bike']>0)&df['bike_sec'].notna(), df['bike_sec']/df['c_med_bike'], np.nan)

    # Cohort percentile
    print("  Cohort percentiles...")
    df['cohort_percentile'] = np.nan
    for _, grp in df.groupby(gc_cols):
        v = grp['total_sec'].notna()
        if v.sum() >= 30:
            ranks = grp.loc[v, 'total_sec'].rank(pct=True)
            df.loc[ranks.index, 'cohort_percentile'] = ranks.values

    # Save
    out_cols = [c for c in SCHEMA + DERIVED if c in df.columns]
    path = CLEANED / 'athlete_race.csv'
    df[out_cols].to_csv(path, index=False)
    sz = path.stat().st_size / (1024**2)
    print(f"\n  ✅ athlete_race.csv: {len(df):,} rows ({sz:.0f} MB)")
    print(f"  Pro: {(df['is_pro']==True).sum():,} | Named: {df['athlete_hash'].notna().sum():,}")

    cohort.to_csv(CLEANED / 'cohort_stats.csv', index=False)
    print(f"  ✅ cohort_stats.csv: {len(cohort):,} cohorts")
    return cohort

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: ATHLETE PROFILES
# ═══════════════════════════════════════════════════════════════════════

def build_profiles(cohort_stats):
    print("\n" + "="*70)
    print("STEP 3: ATHLETE PROFILES")
    print("="*70)

    cols = ['athlete_hash','athlete_name','gender','country','age_group',
            'event_year','event_distance','source',
            'swim_sec','bike_sec','run_sec','total_sec','fade_ratio','finish_status']
    df = pd.read_csv(CLEANED / 'athlete_race.csv', usecols=cols, low_memory=False)
    named = df[df['athlete_hash'].notna()].copy()
    del df; gc.collect()
    print(f"  Named records: {len(named):,} | Unique athletes: {named['athlete_hash'].nunique():,}")

    # Basic agg
    print("  Basic aggregation...")
    p = named.groupby('athlete_hash').agg(
        athlete_name=('athlete_name','first'), gender=('gender','first'),
        country=('country','first'),
        total_races=('total_sec','count'),
        first_race_year=('event_year','min'), latest_race_year=('event_year','max'),
        pb_swim_sec=('swim_sec','min'), pb_bike_sec=('bike_sec','min'),
        pb_run_sec=('run_sec','min'), pb_total_sec=('total_sec','min'),
        mean_total=('total_sec','mean'), std_total=('total_sec','std'),
        mean_fade=('fade_ratio','mean'),
    ).reset_index()
    p['years_active'] = p['latest_race_year'] - p['first_race_year'] + 1
    p['consistency_cv'] = np.where(p['total_races']>=2, p['std_total']/p['mean_total'], np.nan)

    # Distances
    dist = named.groupby('athlete_hash')['event_distance'].apply(
        lambda x: ','.join(sorted(x.dropna().unique()))).reset_index()
    dist.columns = ['athlete_hash','distances_raced']
    p = p.merge(dist, on='athlete_hash', how='left')

    # Improvement slope (vectorized OLS)
    print("  Improvement slopes (vectorized)...")
    v = named.dropna(subset=['event_year','total_sec']).copy()
    v['_xy'] = v['event_year'] * v['total_sec']
    v['_x2'] = v['event_year'] ** 2
    sl = v.groupby('athlete_hash').agg(
        _n=('event_year','count'), _sx=('event_year','sum'),
        _sy=('total_sec','sum'), _sx2=('_x2','sum'), _sxy=('_xy','sum'),
    ).reset_index()
    denom = sl['_n']*sl['_sx2'] - sl['_sx']**2
    sl['improvement_slope'] = np.where(
        (sl['_n']>=2) & (denom.abs()>1e-6),
        (sl['_n']*sl['_sxy'] - sl['_sx']*sl['_sy']) / denom, np.nan)
    p = p.merge(sl[['athlete_hash','improvement_slope']], on='athlete_hash', how='left')
    del v, sl; gc.collect()

    # Discipline z-scores
    print("  Discipline z-scores...")
    modal = named.groupby('athlete_hash').agg(
        gender=('gender','first'),
        age_group=('age_group', lambda x: x.mode().iloc[0] if len(x.mode())>0 else np.nan),
        event_distance=('event_distance', lambda x: x.mode().iloc[0] if len(x.mode())>0 else np.nan),
        avg_swim=('swim_sec','mean'), avg_bike=('bike_sec','mean'), avg_run=('run_sec','mean'),
    ).reset_index()

    modal = modal.merge(
        cohort_stats[['gender','age_group','event_distance',
                       'c_med_swim','c_med_bike','c_med_run','c_std_total']],
        on=['gender','age_group','event_distance'], how='left')
    sf = modal['c_std_total'].clip(lower=300)
    modal['swim_strength_z'] = -(modal['avg_swim'] - modal['c_med_swim']) / sf
    modal['bike_strength_z'] = -(modal['avg_bike'] - modal['c_med_bike']) / sf
    modal['run_strength_z']  = -(modal['avg_run']  - modal['c_med_run'])  / sf

    z_cols = ['swim_strength_z','bike_strength_z','run_strength_z']
    disc = ['swim','bike','run']
    zv = modal[z_cols].values
    best = np.nanargmax(zv, axis=1)
    modal['dominant_discipline'] = [
        disc[i] if not np.all(np.isnan(zv[r])) else np.nan
        for r, i in enumerate(best)]

    p = p.merge(modal[['athlete_hash']+z_cols+['dominant_discipline']],
                on='athlete_hash', how='left')
    del modal; gc.collect()

    # DNF rate (CoachCox only)
    print("  DNF rates...")
    cc = named[named['source']=='coachcox']
    if len(cc) > 0:
        da = cc.groupby('athlete_hash').agg(
            dnf_count=('finish_status', lambda x: (x!='finisher').sum()),
            cc_n=('finish_status','count')).reset_index()
        da['dnf_rate'] = da['dnf_count'] / da['cc_n']
        p = p.merge(da[['athlete_hash','dnf_count','dnf_rate']], on='athlete_hash', how='left')
        p['dnf_count'] = p['dnf_count'].fillna(0).astype(int)
        p['dnf_rate'] = p['dnf_rate'].fillna(0)
    else:
        p['dnf_count'] = 0; p['dnf_rate'] = 0.0

    # Save
    pcols = ['athlete_hash','athlete_name','gender','country',
             'total_races','years_active','distances_raced',
             'pb_swim_sec','pb_bike_sec','pb_run_sec','pb_total_sec',
             'first_race_year','latest_race_year',
             'improvement_slope','consistency_cv',
             'swim_strength_z','bike_strength_z','run_strength_z',
             'dominant_discipline','dnf_count','dnf_rate','mean_fade']
    pcols = [c for c in pcols if c in p.columns]
    p.drop(columns=['mean_total','std_total'], errors='ignore', inplace=True)

    path = CLEANED / 'athlete_profile.csv'
    p[pcols].to_csv(path, index=False)
    sz = path.stat().st_size / (1024**2)
    print(f"\n  ✅ athlete_profile.csv: {len(p):,} rows ({sz:.0f} MB)")
    print(f"  3+ races: {(p['total_races']>=3).sum():,}")
    print(f"  Gender: {p['gender'].value_counts().to_dict()}")

# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    t0 = time()
    print("="*70)
    print("  RACEDAYAI ETL PIPELINE — Plan 07")
    print("="*70)

    print("\n" + "="*70)
    print("STEP 1: PROCESSING SOURCES")
    print("="*70)
    sources = []
    for fn in [process_t100, process_wiki, process_df6, process_coachcox, process_tristat]:
        t1 = time()
        src = fn()
        sources.append(src)
        print(f"  → {len(src):,} rows ({time()-t1:.1f}s)")
        gc.collect()

    cohort = combine_and_derive(sources)
    gc.collect()

    build_profiles(cohort)

    elapsed = time() - t0
    print("\n" + "="*70)
    print(f"  ✅ ETL COMPLETE ({elapsed:.0f}s)")
    print("="*70)
    print(f"\n  Output files in {CLEANED}:")
    for f in ['athlete_race.csv','athlete_profile.csv','cohort_stats.csv']:
        fp = CLEANED / f
        if fp.exists():
            print(f"    {f}: {fp.stat().st_size/(1024**2):.1f} MB")

if __name__ == '__main__':
    main()
