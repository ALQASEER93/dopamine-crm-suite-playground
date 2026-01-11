# Security Baseline

This document describes baseline controls for staging. Adjust for production with stricter policies.

## JWT
- Use a strong, random `JWT_SECRET`.
- Rotate secrets regularly.
- Keep token TTL short for access tokens; use refresh tokens if supported.
- Do not log raw tokens.

## CORS
- Restrict to known staging domains.
- Avoid wildcard origins in staging and production.
- Validate `Origin` and `Referer` headers.

## Rate limits
- Enable request rate limits on the API gateway or application layer.
- Apply stricter limits to auth endpoints.
- Log rate-limit events for review.

## Backups
- Schedule nightly database backups.
- Store backups off-host with limited access.
- Test restore procedures monthly.

## Secrets handling
- Use `.env.example` for documentation only.
- Store real secrets in secure environment variables or a secrets manager.
- Avoid committing any credentials.

## Logging
- Avoid PII in logs where possible.
- Mask or hash identifiers when needed.
- Monitor auth failures and suspicious access patterns.
