def classify_progression(history):
    """Simple trend label; intentionally not a mm-displacement forecast."""
    if len(history) < 5:
        return "INSUFFICIENT_DATA"

    recent = history[-5:]
    slopes = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
    mean_slope = sum(slopes) / len(slopes)

    if mean_slope > 0.01:
        return "ACCELERATING_MOVEMENT"
    if mean_slope > 0.002:
        return "EARLY_MOVEMENT"
    if mean_slope < -0.002:
        return "STABILISING"
    return "PLATEAU"
