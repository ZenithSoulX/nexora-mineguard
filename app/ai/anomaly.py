from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from .config import MODEL_PATH, ANOMALY_SCORE_CAP

_ARTIFACT = None


def _load():
    global _ARTIFACT
    if _ARTIFACT is None:
        # Resolve relative to the project root, not the terminal's current directory.
        project_root = Path(__file__).resolve().parents[2]
        path = project_root / MODEL_PATH
        if not path.exists():
            raise FileNotFoundError(
                f"Isolation Forest model not found at {path}. "
                "Make sure ml/models/isolation_forest.joblib exists."
            )
        _ARTIFACT = joblib.load(path)
    return _ARTIFACT


def detect_anomaly(features):
    """Run Isolation Forest anomaly detection.

    The pre-trained model was built on simulator-scale data (tilt ~0.1°).
    With real MPU6050 hardware (tilt ~1–10°), the model sees everything as
    anomalous.  The ANOMALY_SCORE_CAP prevents it from permanently
    saturating the fusion score while still allowing it to contribute a
    small signal for genuinely unusual patterns.
    """
    try:
        artifact = _load()
    except (FileNotFoundError, Exception) as exc:
        # Graceful fallback: if the model is missing or broken, return
        # a neutral score so the rest of the pipeline still works.
        return 0.0, 0.0

    cols = artifact["feature_cols"]
    # DataFrame preserves feature names and avoids sklearn's feature-name warning.
    x = pd.DataFrame([[features.get(c, 0.0) for c in cols]], columns=cols)

    try:
        raw = float(-artifact["model"].decision_function(x)[0])
    except Exception:
        return 0.0, 0.0

    score = float(1.0 / (1.0 + np.exp(-8.0 * raw)))

    # Cap the score so the untrained model can't dominate the fusion.
    score = min(score, ANOMALY_SCORE_CAP)

    return max(0.0, min(1.0, score)), raw
