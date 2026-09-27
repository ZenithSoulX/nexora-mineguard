import random
from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy.orm import Session

from app.database.dependencies import get_db
from app.models.risk_score import RiskScore
from app.models.alert import Alert
from app.services.sms_alert import send_sms_alert


def generate_alert_for_node(node_id: str, db: Session = Depends(get_db)):

    # Get the latest risk score for this node
    latest_risk = (
        db.query(RiskScore)
        .filter(RiskScore.node_id == node_id)
        .order_by(RiskScore.node_timestamp.desc())
        .first()
    )

    if not latest_risk:
        return {
            "error": "No risk score found for the given node ID"
        }

    score = latest_risk.score

    # =========================================================
    # 1. RISK <= 40
    # Resolve any active alert and do NOT send SMS
    # =========================================================

    if score < 55 :

        active_alert = (
            db.query(Alert)
            .filter(
                Alert.node_id == node_id,
                Alert.status == "ACTIVE"
            )
            .first()
        )

        if active_alert:
            active_alert.status = "RESOLVED"
            active_alert.resolved_at = datetime.fromtimestamp(
                latest_risk.node_timestamp,
                tz=timezone.utc,
            )

            db.commit()

            return {
                "message": "Risk returned to safe level",
                "alert_id": active_alert.id,
                "score": score
            }

        return {
            "message": "Risk level normal",
            "score": score
        }

    # =========================================================
    # 2. RISK > 40
    # HIGH RISK
    # =========================================================

    severity = latest_risk.severity

    # Check if this node already has an active alert
    existing_alert = (
        db.query(Alert)
        .filter(
            Alert.node_id == node_id,
            Alert.status == "ACTIVE"
        )
        .first()
    )

    # =========================================================
    # 3. ACTIVE ALERT ALREADY EXISTS
    # Do NOT send another SMS
    # =========================================================

    if existing_alert:

        # Update the latest score
        existing_alert.score = score
        existing_alert.signal = latest_risk.signal
        existing_alert.node_timestamp = latest_risk.node_timestamp

        db.commit()

        return {
            "message": "Active high-risk alert already exists",
            "alert_id": existing_alert.id,
            "score": score,
            "sms_sent": existing_alert.sms_sent
        }

    # =========================================================
    # 4. NEW HIGH-RISK EVENT
    # =========================================================

    warning_messages = [
        f"WARNING: High subsidence risk detected at node {node_id}. Immediate inspection recommended.",

        f"ALERT: Unsafe ground condition detected at node {node_id}. Please inspect the area.",

        f"CRITICAL WARNING: Node {node_id} indicates elevated mine safety risk. Check the zone immediately.",

        f"MineGuard Alert: High-risk condition detected at node {node_id}. Safety verification required.",

        f"URGENT: Abnormal safety readings detected at node {node_id}. Inspect the affected zone."
    ]

    message = random.choice(warning_messages)

    # Create new alert
    alert = Alert(
        node_id=node_id,
        status="ACTIVE",
        severity=severity,
        signal=latest_risk.signal,
        score=score,
        message=message,
        acknowledged=False,
        sms_sent=False,
        email_sent=False,
        resolved_at=None,
        node_timestamp=latest_risk.node_timestamp,
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    # =========================================================
    # 5. SEND ONE SMS
    # =========================================================

    try:
        send_sms_alert()

        alert.sms_sent = True
        db.commit()

        print(f"SMS alert sent for node {node_id}")

    except Exception as e:
        print(f"SMS sending failed for node {node_id}: {e}")

    # =========================================================
    # 6. RETURN ALERT
    # =========================================================

    return {
        "id": alert.id,
        "node_id": alert.node_id,
        "severity": alert.severity,
        "score": alert.score,
        "signal": alert.signal,
        "message": alert.message,
        "status": alert.status,
        "acknowledged": alert.acknowledged,
        "sms_sent": alert.sms_sent,
        "email_sent": alert.email_sent,
        "resolved_at": alert.resolved_at
    }
