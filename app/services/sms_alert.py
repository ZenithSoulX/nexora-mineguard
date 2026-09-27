import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

def send_sms_alert():
    recipient = os.getenv("TWILIO_SMS_TO")
    if recipient is None:
        raise RuntimeError("TWILIO_SMS_TO is not set")

    message = client.messages.create(
        to=recipient,
        from_=os.getenv("TWILIO_SMS_FROM"),
        body="sms_internal_alerts"
    )

    print("SMS sent:", message.sid)
    return message.sid


if __name__ == "__main__":
    send_sms_alert()
