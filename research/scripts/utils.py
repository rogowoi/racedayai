"""Utility functions for ML training pipeline."""

import logging
import sys
from typing import Dict, Any
import numpy as np
import pandas as pd

# Setup logging
def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    """Setup structured logger."""
    logger = logging.Logger(name)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger


# Time conversion utilities
def time_to_seconds(time_str: str) -> float:
    """Convert HH:MM:SS to seconds."""
    if pd.isna(time_str) or time_str == "":
        return np.nan

    try:
        parts = str(time_str).split(":")
        if len(parts) == 3:
            h, m, s = parts
            return int(h) * 3600 + int(m) * 60 + float(s)
        elif len(parts) == 2:
            m, s = parts
            return int(m) * 60 + float(s)
        else:
            return float(time_str)
    except:
        return np.nan


def seconds_to_time(seconds: float) -> str:
    """Convert seconds to HH:MM:SS."""
    if pd.isna(seconds):
        return ""

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


# Physics utilities
def speed_to_watts(speed_kmh: float, weight_kg: float = 75, crr: float = 0.005, cda: float = 0.35) -> float:
    """
    Estimate power from speed using simplified physics model.

    Args:
        speed_kmh: Speed in km/h
        weight_kg: Rider + bike weight
        crr: Coefficient of rolling resistance
        cda: Drag coefficient × frontal area (m²)

    Returns:
        Power in watts
    """
    speed_ms = speed_kmh / 3.6

    # Rolling resistance: Crr * weight * g * v
    rolling_watts = crr * weight_kg * 9.81 * speed_ms

    # Aerodynamic drag: 0.5 * Cda * rho * v^3
    aero_watts = 0.5 * cda * 1.225 * (speed_ms ** 3)

    return rolling_watts + aero_watts


def watts_to_speed(watts: float, weight_kg: float = 75, crr: float = 0.005, cda: float = 0.35) -> float:
    """
    Estimate speed from power using simplified physics model.
    Inverse of speed_to_watts (solved numerically).

    Returns:
        Speed in km/h
    """
    # Newton's method to solve: watts = speed_to_watts(speed)
    speed_ms = 8.0  # Initial guess: 8 m/s ≈ 29 km/h

    for _ in range(10):  # 10 iterations should converge
        current_watts = speed_to_watts(speed_ms * 3.6, weight_kg, crr, cda) / 3.6

        # Derivative: dP/dv ≈ (P(v+h) - P(v)) / h
        h = 0.01
        watts_plus = speed_to_watts((speed_ms + h) * 3.6, weight_kg, crr, cda) / 3.6
        derivative = (watts_plus - current_watts) / h

        # Newton's method: v_new = v - (P(v) - P_target) / P'(v)
        if derivative != 0:
            speed_ms -= (current_watts - watts) / derivative

    return speed_ms * 3.6


# Model evaluation metrics
def calculate_mae_minutes(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate MAE in minutes."""
    return np.mean(np.abs(y_true - y_pred)) / 60


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate Mean Absolute Percentage Error."""
    return np.mean(np.abs((y_true - y_pred) / y_true)) * 100


def calculate_r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Calculate R² score."""
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    return 1 - (ss_res / ss_tot)


def print_metrics(y_true: np.ndarray, y_pred: np.ndarray, name: str = "Model"):
    """Print regression metrics."""
    mae_sec = np.mean(np.abs(y_true - y_pred))
    mae_min = mae_sec / 60
    mape = calculate_mape(y_true, y_pred)
    r2 = calculate_r2(y_true, y_pred)

    print(f"\n{name} Metrics:")
    print(f"  MAE: {mae_sec:.1f} sec ({mae_min:.2f} min)")
    print(f"  MAPE: {mape:.2f}%")
    print(f"  R²: {r2:.4f}")


# Consistency validation
def validate_swim_consistency(swim_sec: np.ndarray, pace_per_100m: np.ndarray, distance_m: float) -> float:
    """
    Validate swim time and pace are consistent.

    Returns:
        Mean relative error
    """
    implied_seconds = (pace_per_100m * distance_m) / 100
    error = np.abs(implied_seconds - swim_sec) / swim_sec
    return np.mean(error)


def validate_run_consistency(run_sec: np.ndarray, pace_per_km: np.ndarray, distance_km: float) -> float:
    """
    Validate run time and pace are consistent.

    Returns:
        Mean relative error
    """
    implied_seconds = pace_per_km * 60 * distance_km
    error = np.abs(implied_seconds - run_sec) / run_sec
    return np.mean(error)


def validate_bike_consistency(
    bike_sec: np.ndarray,
    avg_watts: np.ndarray,
    distance_km: float,
    weight_kg: float = 75
) -> float:
    """
    Validate bike time and watts are consistent (roughly).

    Returns:
        Mean relative error
    """
    # Calculate speed from time
    actual_speed = distance_km / (bike_sec / 3600)

    # Calculate implied watts from speed
    implied_watts = np.array([speed_to_watts(s, weight_kg) for s in actual_speed])

    # Compare with predicted watts
    error = np.abs(implied_watts - avg_watts) / avg_watts
    return np.mean(error)
