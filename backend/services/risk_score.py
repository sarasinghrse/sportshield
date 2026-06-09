def compute_risk_score(
    matches: list[dict],
    ai_result: dict | None = None,
) -> dict:
    """
    Compute a composite risk score (0–100) for an asset based on scan results.

    Inputs
    ------
    matches   : list of dicts with 'confidence' (0–1) and 'severity' keys
    ai_result : dict with 'is_ai' (bool) and 'confidence' (0–1) keys

    Returns
    -------
    dict with 'score' (int 0–100), 'label', and 'breakdown'
    """
    if not matches and not (ai_result and ai_result.get("is_ai")):
        return {"score": 0, "label": "safe", "breakdown": {}}

    ai_result = ai_result or {}
    n = len(matches)

    # --- Component 1: match volume (0–30 pts) ---
    # Diminishing returns: 1 match = 10, 3 = 20, 5+ = 30
    if n == 0:
        volume_score = 0
    elif n <= 2:
        volume_score = n * 10
    elif n <= 4:
        volume_score = 20 + (n - 2) * 5
    else:
        volume_score = 30

    # --- Component 2: max confidence (0–35 pts) ---
    max_conf = max((m.get("confidence", 0) for m in matches), default=0)
    confidence_score = round(max_conf * 35)

    # --- Component 3: severity distribution (0–20 pts) ---
    high_count = sum(1 for m in matches if m.get("severity") == "high")
    med_count = sum(1 for m in matches if m.get("severity") == "medium")
    severity_score = min(20, high_count * 8 + med_count * 3)

    # --- Component 4: AI-generated flag (0–15 pts) ---
    ai_score = 0
    if ai_result.get("is_ai"):
        ai_score = round(ai_result.get("confidence", 0) * 15)

    total = min(100, volume_score + confidence_score + severity_score + ai_score)

    if total >= 75:
        label = "critical"
    elif total >= 50:
        label = "high"
    elif total >= 25:
        label = "medium"
    else:
        label = "low"

    return {
        "score": total,
        "label": label,
        "breakdown": {
            "volume": volume_score,
            "confidence": confidence_score,
            "severity": severity_score,
            "aiFlag": ai_score,
        },
    }
