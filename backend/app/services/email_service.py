import os
import smtplib
from email.message import EmailMessage


def send_password_reset_email(
    to_email: str,
    reset_url: str,
) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_username

    if not smtp_host:
        raise RuntimeError("SMTP_HOST is not configured.")

    if not smtp_username:
        raise RuntimeError("SMTP_USERNAME is not configured.")

    if not smtp_password:
        raise RuntimeError("SMTP_PASSWORD is not configured.")

    if not smtp_from:
        raise RuntimeError("SMTP_FROM is not configured.")

    message = EmailMessage()

    message["Subject"] = "Reset your FwdNourish! password"
    message["From"] = smtp_from
    message["To"] = to_email

    message.set_content(
        f"""
Hello,

We received a request to reset your FwdNourish! password.

Use the link below to create a new password:

{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email.

Regards,
FwdNourish!
""".strip()
    )

    message.add_alternative(
        f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:30px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="
        max-width:560px;
        margin:auto;
        background:white;
        border:1px solid #e2e8f0;
        border-radius:16px;
        padding:32px;
    ">
        <h2 style="margin-top:0;color:#0f172a;">
            Reset your password
        </h2>

        <p style="color:#475569;line-height:1.6;">
            We received a request to reset your FwdNourish! password.
        </p>

        <p style="margin:28px 0;">
            <a
                href="{reset_url}"
                style="
                    display:inline-block;
                    background:#059669;
                    color:white;
                    text-decoration:none;
                    padding:13px 22px;
                    border-radius:10px;
                    font-weight:bold;
                "
            >
                Reset Password
            </a>
        </p>

        <p style="color:#64748b;font-size:14px;line-height:1.6;">
            This link will expire in <strong>1 hour</strong>.
        </p>

        <p style="color:#64748b;font-size:14px;line-height:1.6;">
            If you did not request a password reset, you can safely ignore
            this email.
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:25px 0;">

        <p style="color:#94a3b8;font-size:12px;">
            FwdNourish! — AI-Powered Food Waste Management
        </p>
    </div>
</body>
</html>
""",
        subtype="html",
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(message)