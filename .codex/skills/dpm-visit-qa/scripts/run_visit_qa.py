import json
import os
import subprocess
from pathlib import Path
from datetime import datetime, timezone, date
import urllib.request
import urllib.error
import urllib.parse

DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1"
DEFAULT_EMAIL = "rep1@example.com"
DEFAULT_PASSWORD = "Rep12345!"


def http_request(method, url, token=None, payload=None):
    headers = {
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return exc.code, body
    except urllib.error.URLError as exc:
        return 0, f"URLError: {exc}"


def parse_json(body):
    if not body:
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        return None


def require_non_prod(base_url, allow_prod):
    if allow_prod:
        return
    safe_hosts = ("127.0.0.1", "localhost")
    if not any(host in base_url for host in safe_hosts):
        raise RuntimeError(
            "Refusing to run against non-localhost base URL without DPM_VISIT_QA_ALLOW_PROD=1."
        )


def find_repo_root(start: Path) -> Path | None:
    for parent in [start, *start.parents]:
        if (parent / ".git").exists():
            return parent
    return None


def read_git_commit(repo_root: Path | None) -> str:
    if not repo_root:
        return "unknown"
    head = repo_root / ".git" / "HEAD"
    if not head.exists():
        return "unknown"
    content = head.read_text(encoding="utf-8").strip()
    if content.startswith("ref:"):
        ref = repo_root / ".git" / content.split(" ", 1)[1].strip()
        if ref.exists():
            return ref.read_text(encoding="utf-8").strip()
    return content


def write_report(report_path, context, results, notes):
    total = len(results)
    passed = sum(1 for r in results if r["ok"])
    failed = total - passed

    lines = []
    lines.append(f"# Visit QA Report")
    lines.append("")
    lines.append(f"- Timestamp (UTC): {context['timestamp']}")
    lines.append(f"- Base URL: {context['base_url']}")
    lines.append(f"- Rep Email: {context['email']}")
    lines.append("")
    lines.append(f"## Summary")
    lines.append("")
    lines.append(f"- Total: {total}")
    lines.append(f"- Passed: {passed}")
    lines.append(f"- Failed: {failed}")
    lines.append("")
    lines.append("## Results")
    lines.append("")
    lines.append("| Test | Status | Details |")
    lines.append("| --- | --- | --- |")
    for item in results:
        status = "PASS" if item["ok"] else "FAIL"
        detail = item.get("detail", "")
        lines.append(f"| {item['name']} | {status} | {detail} |")
    lines.append("")
    if notes:
        lines.append("## Notes")
        lines.append("")
        for note in notes:
            lines.append(f"- {note}")
        lines.append("")

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")


def main():
    base_url = os.getenv("DPM_VISIT_QA_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    email = os.getenv("DPM_VISIT_QA_EMAIL", DEFAULT_EMAIL)
    password = os.getenv("DPM_VISIT_QA_PASSWORD", DEFAULT_PASSWORD)
    allow_prod = os.getenv("DPM_VISIT_QA_ALLOW_PROD") == "1"

    require_non_prod(base_url, allow_prod)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_path = Path("docs") / "_runs" / f"visit_qa_{timestamp}.md"

    context = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "base_url": base_url,
        "email": email,
    }

    results = []
    notes = []
    token = None
    rep_id = None
    role_slug = None
    tracking_rep_id = None
    visit_id = None
    device_id = None

    # Meta version check
    status, body = http_request("GET", f"{base_url}/meta/version")
    meta = parse_json(body)
    repo_root = find_repo_root(Path(__file__).resolve())
    local_commit = read_git_commit(repo_root)
    if status == 200 and meta:
        openapi_has_tracking = meta.get("openapi_has_tracking") is True
        commit_matches = meta.get("git_commit") == local_commit
        results.append({
            "name": "Meta version",
            "ok": commit_matches and openapi_has_tracking,
            "detail": f"server_commit={meta.get('git_commit')} local_commit={local_commit} tracking={openapi_has_tracking}",
        })
        if not commit_matches or not openapi_has_tracking:
            notes.append("Meta check failed: commit mismatch or tracking missing.")
            write_report(report_path, context, results, notes)
            print(report_path)
            return 1
    else:
        results.append({"name": "Meta version", "ok": False, "detail": f"status={status} body={body}"})
        write_report(report_path, context, results, notes)
        print(report_path)
        return 1

    # Login
    status, body = http_request(
        "POST",
        f"{base_url}/auth/login",
        payload={"email": email, "password": password},
    )
    data = parse_json(body)
    if status == 200 and data and data.get("token"):
        token = data["token"]
        user = data.get("user") or {}
        rep_id = user.get("id")
        role_slug = (user.get("role") or {}).get("slug")
        tracking_rep_id = rep_id
        results.append({
            "name": "Auth login",
            "ok": True,
            "detail": f"rep_id={rep_id} role={role_slug}",
        })
    else:
        results.append({"name": "Auth login", "ok": False, "detail": f"status={status} body={body}"})
        write_report(report_path, context, results, notes)
        print(report_path)
        return 1

    if role_slug in ("admin", "supervisor"):
        lookup_email = DEFAULT_EMAIL
        encoded_email = urllib.parse.quote(lookup_email)
        status, body = http_request(
            "GET",
            f"{base_url}/reps?email={encoded_email}",
            token=token,
        )
        data = parse_json(body) or []
        tracking_rep_id = data[0].get("id") if status == 200 and data else None
        results.append({
            "name": "Resolve rep for tracking status (admin)",
            "ok": tracking_rep_id is not None,
            "detail": f"status={status} email={lookup_email} rep_id={tracking_rep_id} body={body}"
            if status != 200 or tracking_rep_id is None
            else f"status={status} email={lookup_email} rep_id={tracking_rep_id}",
        })
        if tracking_rep_id is None:
            write_report(report_path, context, results, notes)
            print(report_path)
            return 1

    # Get a doctor
    status, body = http_request("GET", f"{base_url}/doctors/?page=1&page_size=1", token=token)
    data = parse_json(body) or {}
    doctor_id = None
    if status == 200 and data.get("data"):
        doctor_id = data["data"][0].get("id")
        results.append({"name": "Fetch doctor", "ok": True, "detail": f"doctor_id={doctor_id}"})
    else:
        results.append({"name": "Fetch doctor", "ok": False, "detail": f"status={status} body={body}"})
        write_report(report_path, context, results, notes)
        print(report_path)
        return 1

    # Create visit
    visit_payload = {
        "visit_date": date.today().isoformat(),
        "rep_id": rep_id,
        "doctor_id": doctor_id,
        "notes": "QA smoke visit",
    }
    status, body = http_request("POST", f"{base_url}/visits/", token=token, payload=visit_payload)
    data = parse_json(body)
    if status in (200, 201) and data and data.get("id"):
        visit_id = data["id"]
        results.append({"name": "Create visit", "ok": True, "detail": f"status={status} visit_id={visit_id}"})
    else:
        results.append({"name": "Create visit", "ok": False, "detail": f"status={status} body={body}"})
        write_report(report_path, context, results, notes)
        print(report_path)
        return 1

    try:
        visit_started = False
        visit_ended = False

        # Start visit without GPS (expect 400)
        status, body = http_request("POST", f"{base_url}/visits/{visit_id}/start", token=token, payload={})
        if status == 200:
            visit_started = True
        results.append({
            "name": "Start visit without GPS",
            "ok": status in (400, 422),
            "detail": f"status={status} body={body}" if status not in (400, 422) else f"status={status}",
        })

        # Start visit with poor accuracy and no override (expect 400)
        if visit_started:
            results.append({
                "name": "Start visit poor accuracy without override",
                "ok": False,
                "detail": "SKIPPED: visit already started unexpectedly",
            })
        else:
            status, body = http_request(
                "POST",
                f"{base_url}/visits/{visit_id}/start",
                token=token,
                payload={"lat": 31.9539, "lng": 35.9106, "accuracy": 500},
            )
            if status == 200:
                visit_started = True
            results.append({
                "name": "Start visit poor accuracy without override",
                "ok": status == 400,
                "detail": f"status={status} body={body}" if status != 400 else f"status={status}",
            })

        # Start visit with override
        if visit_started:
            results.append({
                "name": "Start visit with override",
                "ok": False,
                "detail": "SKIPPED: visit already started",
            })
        else:
            status, body = http_request(
                "POST",
                f"{base_url}/visits/{visit_id}/start",
                token=token,
                payload={"lat": 31.9539, "lng": 35.9106, "accuracy": 500, "override_reason": "QA override"},
            )
            data = parse_json(body) or {}
            visit_started = status == 200 and data.get("status") == "IN_PROGRESS"
            results.append({
                "name": "Start visit with override",
                "ok": status == 200 and data.get("status") == "IN_PROGRESS",
                "detail": f"status={status} visit_status={data.get('status')} body={body}" if status != 200 else f"status={status} visit_status={data.get('status')}",
            })

        # End visit without GPS (expect 400)
        if not visit_started:
            results.append({
                "name": "End visit without GPS",
                "ok": False,
                "detail": "SKIPPED: visit not in progress",
            })
        else:
            status, body = http_request("POST", f"{base_url}/visits/{visit_id}/end", token=token, payload={})
            if status == 200:
                visit_ended = True
            results.append({
                "name": "End visit without GPS",
                "ok": status in (400, 422),
                "detail": f"status={status} body={body}" if status not in (400, 422) else f"status={status}",
            })

        # End visit far distance without override (expect 400)
        if not visit_started or visit_ended:
            results.append({
                "name": "End visit far distance without override",
                "ok": False,
                "detail": "SKIPPED: visit not in progress or already ended",
            })
        else:
            status, body = http_request(
                "POST",
                f"{base_url}/visits/{visit_id}/end",
                token=token,
                payload={"lat": 0.0, "lng": 0.0, "accuracy": 10},
            )
            if status == 200:
                visit_ended = True
            results.append({
                "name": "End visit far distance without override",
                "ok": status == 400,
                "detail": f"status={status} body={body}" if status != 400 else f"status={status}",
            })

        # End visit with override
        if not visit_started or visit_ended:
            results.append({
                "name": "End visit with override",
                "ok": False,
                "detail": "SKIPPED: visit not in progress or already ended",
            })
        else:
            status, body = http_request(
                "POST",
                f"{base_url}/visits/{visit_id}/end",
                token=token,
                payload={"lat": 0.0, "lng": 0.0, "accuracy": 10, "override_reason": "QA override"},
            )
            data = parse_json(body) or {}
            visit_ended = status == 200 and data.get("status") == "COMPLETED"
            results.append({
                "name": "End visit with override",
                "ok": status == 200 and data.get("status") == "COMPLETED",
                "detail": f"status={status} visit_status={data.get('status')} body={body}" if status != 200 else f"status={status} visit_status={data.get('status')}",
            })

        # Register device
        status, body = http_request(
            "POST",
            f"{base_url}/devices/register",
            token=token,
            payload={"platform": "android", "device_label": "QA Device"},
        )
        data = parse_json(body) or {}
        device_id = data.get("id")
        results.append({
            "name": "Register device",
            "ok": status == 201 and device_id is not None,
            "detail": f"status={status} device_id={device_id} body={body}" if status != 201 else f"status={status} device_id={device_id}",
        })
        if device_id is not None:
            # Send location event batch
            event_payload = {
                "events": [
                    {
                        "device_id": device_id,
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "lat": 31.9539,
                        "lng": 35.9106,
                        "accuracy_m": 12,
                        "source": "qa",
                    }
                ]
            }
            status, body = http_request(
                "POST",
                f"{base_url}/location-events/batch",
                token=token,
                payload=event_payload,
            )
            data = parse_json(body) or {}
            results.append({
                "name": "Send location event batch",
                "ok": status == 200 and data.get("received") == 1,
                "detail": f"status={status} received={data.get('received')} body={body}" if status != 200 else f"status={status} received={data.get('received')}",
            })

        # Tracking status
        if role_slug in ("admin", "supervisor"):
            status, body = http_request(
                "GET",
                f"{base_url}/reps/tracking-status?rep_id={tracking_rep_id}",
                token=token,
            )
        else:
            status, body = http_request(
                "GET",
                f"{base_url}/reps/{rep_id}/tracking-status",
                token=token,
            )
        data = parse_json(body) or {}
        tracking_active = data.get("trackingActive")
        ok_tracking = status == 200 and tracking_active is not None
        results.append({
            "name": "Tracking status",
            "ok": ok_tracking,
            "detail": f"status={status} rep_id={tracking_rep_id} trackingActive={tracking_active} body={body}"
            if status != 200
            else f"status={status} rep_id={tracking_rep_id} trackingActive={tracking_active}",
        })
        if status == 200 and tracking_active is False:
            notes.append("Tracking status returned trackingActive=false. This may be expected if no recent device activity.")

    finally:
        # Cleanup visit
        if visit_id is not None:
            status, body = http_request("DELETE", f"{base_url}/visits/{visit_id}", token=token)
            results.append({
                "name": "Cleanup visit (delete)",
                "ok": status == 204,
                "detail": f"status={status}",
            })
        else:
            notes.append("Visit cleanup skipped because visit_id was not created.")

        # Optional device cleanup (admin-only)
        if device_id is not None:
            status, body = http_request("DELETE", f"{base_url}/devices/{device_id}", token=token)
            ok = status in (204, 404, 403)
            results.append({
                "name": "Cleanup device (admin-only)",
                "ok": ok,
                "detail": f"status={status} body={body}",
            })
            if status == 403:
                notes.append("Device cleanup requires admin; 403 is expected for rep token.")

    notes.append("Device cleanup is admin-only; run with admin token if needed.")

    write_report(report_path, context, results, notes)
    print(report_path)

    failed = any(not r["ok"] for r in results)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
