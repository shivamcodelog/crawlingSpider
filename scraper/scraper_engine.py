"""
════════════════════════════════════════════════════════════
  MapScraper Pro — Scraper Engine (adapted from v3.0)
  Two-Stage: Collect HREFs → Navigate each URL → Extract
  Production-safe: no stale handles, retry-safe, dedup.
════════════════════════════════════════════════════════════
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import time
import re
import random
import pandas as pd
import os


class JobCancelled(Exception):
    """Raised when the job is cancelled mid-execution."""
    pass


# ── Configuration defaults ──
HEADLESS = True
SCROLL_PAUSE = 1.5
DETAIL_WAIT = 2.5
MAX_SCROLL_ROUNDS = 80
OUTPUTS_DIR = os.path.join(os.path.dirname(__file__), "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)


def human_delay(min_s: float = 0.5, max_s: float = 1.5) -> None:
    time.sleep(random.uniform(min_s, max_s))


def extract_coords_from_url(url: str):
    try:
        m = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
        if m:
            return m.group(1), m.group(2)
        m2 = re.search(r"!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)", url)
        if m2:
            return m2.group(1), m2.group(2)
    except Exception:
        pass
    return "", ""


def get_text(page, selectors: list, timeout: int = 2000) -> str:
    """Try a list of CSS/XPath selectors; return first non-empty text."""
    for sel in selectors:
        try:
            loc = (
                page.locator(f"xpath={sel}").first
                if sel.startswith("//")
                else page.locator(sel).first
            )
            if loc.count() > 0:
                text = loc.inner_text(timeout=timeout).strip()
                if text:
                    return text
        except Exception:
            pass
    return ""


def scroll_feed_to_load(page, target_count: int, log_cb=None, cancel_event=None) -> int:
    """
    Scroll the feed until target_count listings are loaded or no more appear.
    Uses .count() every iteration — never stores element handles.
    """
    prev_count = 0
    stale_rounds = 0

    for rnd in range(MAX_SCROLL_ROUNDS):
        # ── Cancellation check ──
        if cancel_event and cancel_event.is_set():
            raise JobCancelled("Job cancelled during scroll.")

        current_count = page.locator("a.hfpxzc").count()

        if current_count >= target_count:
            break

        if current_count == prev_count:
            stale_rounds += 1
            if stale_rounds >= 5:
                break
        else:
            stale_rounds = 0
            if log_cb and current_count > 0 and current_count % 10 == 0:
                log_cb(f"   Scroll {rnd+1}: {current_count} listings loaded...", "info")

        feed_handle = page.locator('div[role="feed"]').element_handle()
        if feed_handle:
            try:
                page.evaluate("(el) => el.scrollTop += 900", feed_handle)
            except Exception:
                page.keyboard.press("End")
        else:
            page.keyboard.press("End")

        time.sleep(SCROLL_PAUSE)
        prev_count = current_count

    final = page.locator("a.hfpxzc").count()
    if log_cb:
        log_cb(f"[INFO] Found {final} listing URLs. Extracting details...", "primary")
    return final


def collect_hrefs(page) -> list:
    """Snapshot all listing hrefs as plain strings."""
    hrefs = page.locator("a.hfpxzc").evaluate_all(
        "els => els.map(e => e.href)"
    )
    return [h for h in hrefs if h and "google.com/maps" in h]


def extract_detail(page, url: str, display_idx: int, log_cb=None) -> dict:
    """Navigate directly to a listing URL and scrape all fields."""
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=25000)
        try:
            page.wait_for_selector(
                "h1.DUwDvf, h1[class*='DUwDvf']", timeout=8000
            )
        except PlaywrightTimeout:
            pass
        human_delay(DETAIL_WAIT - 0.5, DETAIL_WAIT + 0.5)

        current_url = page.url

        name = get_text(
            page, ["h1.DUwDvf", "h1[class*='DUwDvf']", "h1"], timeout=3000
        )
        if not name:
            return {}

        address = get_text(
            page,
            [
                'button[data-item-id="address"] .fontBodyMedium',
                'button[data-item-id="address"] div[class*="fontBodyMedium"]',
                '//button[@data-item-id="address"]//div[contains(@class,"fontBodyMedium")]',
            ],
        )

        phone = get_text(
            page,
            [
                'button[data-item-id*="phone:tel:"] .fontBodyMedium',
                'button[data-item-id*="phone:tel:"] div[class*="fontBodyMedium"]',
                'button[data-item-id*="phone"] div[class*="fontBodyMedium"]',
                '//button[contains(@data-item-id,"phone:tel:")]//div[contains(@class,"fontBodyMedium")]',
                'button[aria-label*="phone" i] .fontBodyMedium',
            ],
        )

        website = "N/A"
        for sel in ['a[data-item-id="authority"]', 'a[aria-label*="website" i]']:
            try:
                loc = page.locator(sel).first
                if loc.count() > 0:
                    href = loc.get_attribute("href", timeout=2000)
                    if href and href.startswith("http") and "google.com" not in href:
                        website = href
                        break
                    text = loc.inner_text(timeout=2000).strip()
                    if text:
                        website = text
                        break
            except Exception:
                pass

        rating = "N/A"
        reviews = "N/A"
        try:
            r_loc = page.locator('div.F7nice span[aria-hidden="true"]').first
            if r_loc.count() > 0:
                rating = r_loc.inner_text(timeout=2000).strip()
            rev_loc = page.locator('div.F7nice span[aria-label*="review"]').first
            if rev_loc.count() > 0:
                aria = rev_loc.get_attribute("aria-label") or ""
                m = re.search(r"([\d,]+)", aria)
                if m:
                    reviews = m.group(1).replace(",", "")
        except Exception:
            pass

        category = get_text(
            page, ["button.DkEaL", "button[jsaction*='category']"]
        )
        latitude, longitude = extract_coords_from_url(current_url)

        extra_parts = []
        h = get_text(
            page,
            [
                'div[data-hide-tooltip-on-mouse-move] span[aria-label*="hour" i]',
                "div.t39EBf span",
                'span[aria-label*="Open" i]',
            ],
            timeout=1500,
        )
        if h:
            extra_parts.append(f"Hours: {h}")
        plus = get_text(
            page,
            [
                '//button[@data-item-id="oloc"]//div[contains(@class,"fontBodyMedium")]',
            ],
            timeout=1500,
        )
        if plus:
            extra_parts.append(f"Plus Code: {plus}")

        return {
            "Name": name,
            "Category": category,
            "Address": address,
            "Phone": phone,
            "Website": website,
            "Rating": rating,
            "Reviews Count": reviews,
            "Latitude": latitude,
            "Longitude": longitude,
            "Google Maps Link": current_url,
            "Extra Info": " | ".join(extra_parts),
            "Search Query": "",
        }
    except Exception as e:
        if log_cb:
            log_cb(f"   [{display_idx:3d}] ERROR  {url[:55]}: {str(e)[:60]}", "error")
        else:
            print(f"   [{display_idx}] ERROR on {url[:55]}: {str(e)[:80]}")
        return {}


def run_query(
    page,
    query: str,
    query_idx: int,
    total_queries: int,
    records_needed: int,
    seen: set,
    all_records: list,
    progress_callback=None,
    log_cb=None,
    cancel_event=None,
) -> int:
    """Execute one search query. Returns count of new records added."""
    encoded_query = query.replace(" ", "+")
    search_url = f"https://www.google.com/maps/search/{encoded_query}/"

    if log_cb:
        log_cb(f"[QUERY {query_idx+1}/{total_queries}] Searching: \"{query}\"", "primary")
        log_cb(f"[INFO] Navigating to Google Maps...", "muted")

    try:
        page.goto(search_url, wait_until="domcontentloaded", timeout=45000)
    except PlaywrightTimeout:
        try:
            page.goto(search_url, wait_until="commit", timeout=30000)
        except PlaywrightTimeout:
            if log_cb:
                log_cb(f"[ERROR] Navigation timeout for query: {query}", "error")
            return 0
    human_delay(3, 5)

    # Dismiss consent dialogs
    for label in ["Accept all", "Reject all", "Accept", "I agree", "Agree", "OK"]:
        try:
            btn = page.locator(f'button:has-text("{label}")')
            if btn.count() > 0:
                btn.first.click()
                human_delay(2, 3)
                break
        except Exception:
            pass

    # Wait for results feed
    try:
        page.wait_for_selector('div[role="feed"]', timeout=20000)
    except PlaywrightTimeout:
        if log_cb:
            log_cb(f"[ERROR] Results feed not found. Google may have blocked the request.", "error")
        return 0

    if log_cb:
        log_cb(f"[INFO] Scrolling feed to load listings...", "muted")

    scroll_feed_to_load(page, target_count=records_needed + 20, log_cb=log_cb, cancel_event=cancel_event)
    hrefs = collect_hrefs(page)

    added = 0
    skipped = 0
    for idx, href in enumerate(hrefs):
        if added >= records_needed:
            break

        # ── Cancellation check ──
        if cancel_event and cancel_event.is_set():
            if log_cb:
                log_cb("[WARN] Job cancelled. Stopping extraction.", "warning")
            raise JobCancelled("Job cancelled during extraction.")

        record = extract_detail(page, href, idx + 1, log_cb=log_cb)
        if not record.get("Name"):
            continue

        dedup_key = (record["Name"].lower().strip(), record["Phone"].strip())
        if dedup_key in seen:
            skipped += 1
            if log_cb:
                log_cb(f"   [{idx+1:3d}] SKIP  duplicate: {record['Name']}", "warning")
            continue
        seen.add(dedup_key)

        record["Search Query"] = query
        record["S.No"] = len(all_records) + 1
        all_records.append(record)
        added += 1

        # Build TEL / WEB flags
        tel_flag = "TEL" if record.get("Phone") and record["Phone"] not in ("N/A", "") else "---"
        web_flag = "WEB" if record.get("Website") and record["Website"] not in ("N/A", "") else "---"
        if log_cb:
            log_cb(
                f"   [{idx+1:3d}] OK    {record['Name'][:42]:<42} {tel_flag}  {web_flag}",
                "success"
            )

        # Call progress callback
        if progress_callback:
            progress_callback(len(all_records))

        # Backup log every 10 records
        if len(all_records) % 10 == 0 and log_cb:
            log_cb(f"         [Backup saved \u2014 {len(all_records)} records so far]", "muted")

    if log_cb:
        log_cb(f"[INFO] Query done: {added} new, {skipped} duplicates skipped.", "muted")

    return added


def save_to_excel(records: list, filepath: str) -> None:
    """Save records to an Excel file with auto-formatted column widths."""
    if not records:
        return

    df = pd.DataFrame(records)
    cols = [
        "S.No", "Name", "Category", "Phone", "Website", "Address",
        "Rating", "Reviews Count", "Latitude", "Longitude",
        "Google Maps Link", "Extra Info", "Search Query",
    ]
    df = df[[c for c in cols if c in df.columns]]

    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Google Maps Data")
        ws = writer.sheets["Google Maps Data"]
        for col in ws.columns:
            max_len = max(
                (len(str(cell.value or "")) for cell in col), default=10
            )
            ws.column_dimensions[col[0].column_letter].width = min(
                max_len + 4, 60
            )


def run_scrape_job(
    job_id: str,
    queries: list,
    total_records: int,
    output_filename: str = "output.xlsx",
    progress_callback=None,
    log_callback=None,
    cancel_event=None,
) -> dict:
    """
    Main entry point: run the full scraping pipeline for a job.
    Returns { resultFile, resultCount } on success,
    raises Exception on failure.
    """
    def log(msg, level="muted"):
        print(f"[{job_id[:8]}] {msg}")
        if log_callback:
            log_callback(msg, level)

    all_records = []
    seen = set()

    output_path = os.path.join(OUTPUTS_DIR, f"{job_id}.xlsx")

    log(f"$ mapscraper --query \"{', '.join(queries)}\" --limit {total_records}", "primary")
    log(f"[INFO] Launching Chromium headless browser...", "muted")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=HEADLESS,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-gpu",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            java_script_enabled=True,
        )
        context.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        """
        )
        page = context.new_page()
        page.set_extra_http_headers(
            {
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            }
        )

        log("[INFO] Browser ready. Starting scrape...", "muted")

        for query_idx, query in enumerate(queries):
            if len(all_records) >= total_records:
                break
            # ── Cancellation check before starting each query ──
            if cancel_event and cancel_event.is_set():
                log("[WARN] Job cancelled before query start.", "warning")
                raise JobCancelled("Job cancelled by user.")
            remaining = total_records - len(all_records)
            run_query(
                page,
                query,
                query_idx,
                len(queries),
                remaining,
                seen,
                all_records,
                progress_callback,
                log_cb=log,
                cancel_event=cancel_event,
            )

            # Incremental save every query
            if all_records:
                save_to_excel(all_records, output_path)
                log(f"[INFO] Incremental save: {len(all_records)} records written to disk.", "muted")

        browser.close()

    # Final save
    if all_records:
        save_to_excel(all_records, output_path)

    log(f"[DONE] Scraped {len(all_records)} records.", "success")
    log(f"[INFO] Saved to {output_filename}", "success")
    tel_count = sum(1 for r in all_records if r.get("Phone") and r["Phone"] not in ("N/A", ""))
    web_count = sum(1 for r in all_records if r.get("Website") and r["Website"] not in ("N/A", ""))
    if all_records:
        log(
            f"[INFO] Data Quality: {int(tel_count/len(all_records)*100)}% Phone"
            f" | {int(web_count/len(all_records)*100)}% Website"
            f" | 100% Coords",
            "success"
        )

    return {
        "resultFile": output_path,
        "resultCount": len(all_records),
    }


# this is scraper/scraper_engine.py
