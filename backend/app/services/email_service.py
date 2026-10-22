import html
import os
import smtplib
import ssl
from email.message import EmailMessage


def send_password_reset_email(
    to_email: str,
    reset_url: str,
) -> None:
    # Load SMTP configuration from environment variables.
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "").strip() or smtp_username

    # Validate required configuration before connecting.
    if not smtp_host:
        raise RuntimeError("SMTP_HOST is not configured.")

    if not smtp_username:
        raise RuntimeError("SMTP_USERNAME is not configured.")

    if not smtp_password:
        raise RuntimeError("SMTP_PASSWORD is not configured.")

    if not smtp_from:
        raise RuntimeError("SMTP_FROM is not configured.")

    if not 1 <= smtp_port <= 65535:
        raise RuntimeError("SMTP_PORT must be a valid port number.")

    # Escape values inserted into HTML.
    safe_reset_url = html.escape(reset_url, quote=True)

    message = EmailMessage()
    message["Subject"] = "Reset your FwdNourish! password"
    message["From"] = smtp_from
    message["To"] = to_email

    # Plain-text version for email clients that do not support HTML.
    message.set_content(
        f"""\
Hello,

We received a request to reset your FwdNourish! password.

Use the link below to create a new password:

{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email.

Regards,
FwdNourish!
"""
    )

    # HTML version.
    message.add_alternative(
        f"""\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:30px;background:#f8fafc;font-family:Arial,sans-serif;">
    <div style="max-width:560px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
        <h2 style="margin-top:0;color:#0f172a;">
            Reset your password
        </h2>

        <p style="color:#475569;line-height:1.6;">
            We received a request to reset your FwdNourish! password.
        </p>

        <p style="margin:28px 0;">
            <a
                href="{safe_reset_url}"
                style="display:inline-block;background:#059669;color:white;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:bold;"
            >
                Reset Password
            </a>
        </p>

        <p style="color:#64748b;font-size:14px;line-height:1.6;">
            This link will expire in <strong>1 hour</strong>.
        </p>

        <p style="color:#64748b;font-size:14px;line-height:1.6;">
            If you did not request a password reset, you can safely ignore this email.
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

    # Use the TLS method that matches the configured SMTP port.
    tls_context = ssl.create_default_context()

    print("SMTP host:", repr(smtp_host))
    print("SMTP port:", smtp_port)
    print("SMTP username:", repr(smtp_username))
    print("SMTP password length:", len(smtp_password))
    print("SMTP sender:", repr(smtp_from))

    if smtp_port == 465:
        # Port 465 uses implicit TLS from the start.
        with smtplib.SMTP_SSL(
            smtp_host,
            smtp_port,
            timeout=30,
            context=tls_context,
        ) as server:
            server.login(smtp_username, smtp_password)
            server.send_message(message)

    else:
        # Port 587 normally uses STARTTLS.
        with smtplib.SMTP(
            smtp_host,
            smtp_port,
            timeout=30,
        ) as server:
            server.ehlo()
            server.starttls(context=tls_context)
            server.ehlo()

            server.login(smtp_username, smtp_password)
            server.send_message(message)
