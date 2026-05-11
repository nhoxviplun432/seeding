"""
Playwright-based Facebook login service.
Flow:
  1. Launch Chromium (stealth)
  2. Apply proxy + user-agent from account
  3. Load cookie if exists (skip password login)
  4. If no valid session -> login with email/password
  5. Handle 2FA checkpoint -> generate OTP via pyotp
  6. Detect checkpoint / banned pages
  7. Scrape uid, name, avatar from DOM
  8. Save storage_state (session) back to DB
"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

import pyotp

logger = logging.getLogger(__name__)

# Step labels forwarded to the frontend via SSE / polling
STEP_STARTING      = "starting"
STEP_LOADING_PAGE  = "loading_page"
STEP_LOGGING_IN    = "logging_in"
STEP_2FA           = "2fa"
STEP_SCRAPING      = "scraping"
STEP_SAVING        = "saving"
STEP_DONE          = "done"
STEP_CHECKPOINT    = "checkpoint"
STEP_BANNED        = "banned"
STEP_ERROR         = "error"


@dataclass
class LoginResult:
    success:    bool
    step:       str
    message:    str
    uid:        Optional[str] = None
    name:       Optional[str] = None
    avatar_url: Optional[str] = None
    cookie:     Optional[str] = None
    session_data: Optional[str] = None


async def login_facebook(
    *,
    email: str,
    password: str,
    two_fa_secret: Optional[str] = None,
    cookie: Optional[str] = None,
    user_agent: Optional[str] = None,
    proxy: Optional[dict] = None,  # {"server": "http://host:port", "username":..., "password":...}
) -> LoginResult:
    """
    Async Playwright login. Returns LoginResult.
    Must be called inside an async context.
    """
    try:
        from playwright.async_api import async_playwright
        from playwright_stealth import stealth_async
    except ImportError:
        return LoginResult(
            success=False, step=STEP_ERROR,
            message="playwright or playwright-stealth not installed",
        )

    async with async_playwright() as pw:
        launch_opts: dict = {"headless": True}
        if proxy:
            launch_opts["proxy"] = proxy

        browser = await pw.chromium.launch(**launch_opts)

        ctx_opts: dict = {}
        if user_agent:
            ctx_opts["user_agent"] = user_agent

        context = await browser.new_context(**ctx_opts)
        page    = await context.new_page()
        await stealth_async(page)

        try:
            # ── 1. Try cookie session first ──────────────────────────────
            if cookie:
                parsed = _parse_cookie_string(cookie)
                if parsed:
                    await context.add_cookies(parsed)
                    await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=30000)
                    if await _is_logged_in(page):
                        return await _scrape_and_finish(page, context, cookie=cookie)

            # ── 2. Password login ────────────────────────────────────────
            logger.info("Starting password login for %s", email)
            await page.goto("https://www.facebook.com/login", wait_until="domcontentloaded", timeout=30000)

            await page.fill("#email", email)
            await page.fill("#pass",  password)
            await page.click("[name='login']")
            await page.wait_for_load_state("domcontentloaded", timeout=20000)

            url = page.url

            # ── 3. 2FA checkpoint ────────────────────────────────────────
            if "checkpoint" in url or "two_step" in url or "login/checkpoint" in url:
                if two_fa_secret:
                    otp = pyotp.TOTP(two_fa_secret).now()
                    try:
                        await page.wait_for_selector("input[name='approvals_code']", timeout=8000)
                        await page.fill("input[name='approvals_code']", otp)
                        await page.click("[id='checkpointSubmitButton']")
                        await page.wait_for_load_state("domcontentloaded", timeout=15000)
                        # "Continue" prompts
                        for _ in range(3):
                            btn = await page.query_selector("[id='checkpointSubmitButton']")
                            if btn:
                                await btn.click()
                                await page.wait_for_load_state("domcontentloaded", timeout=10000)
                            else:
                                break
                    except Exception as e:
                        logger.warning("2FA fill error: %s", e)
                        return LoginResult(
                            success=False, step=STEP_2FA,
                            message="2FA required but could not fill OTP automatically",
                        )
                else:
                    return LoginResult(
                        success=False, step=STEP_CHECKPOINT,
                        message="Account hit checkpoint / 2FA required. Provide two_fa_secret.",
                    )

            url = page.url

            # ── 4. Banned / suspicious-login page ───────────────────────
            if "disabled" in url or "sorry" in url:
                return LoginResult(success=False, step=STEP_BANNED, message="Account appears banned.")

            if not await _is_logged_in(page):
                return LoginResult(
                    success=False, step=STEP_ERROR,
                    message="Login failed. Wrong password or unknown block.",
                )

            # ── 5. Scrape & return ───────────────────────────────────────
            new_cookie = await _dump_cookie_string(context)
            return await _scrape_and_finish(page, context, cookie=new_cookie)

        except Exception as exc:
            logger.exception("Playwright login error")
            return LoginResult(success=False, step=STEP_ERROR, message=str(exc))
        finally:
            await browser.close()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _is_logged_in(page) -> bool:
    """Check if the current page indicates an active session."""
    url = page.url
    if "facebook.com" not in url:
        return False
    if "/login" in url or "login.php" in url:
        return False
    # presence of top nav user menu
    try:
        el = await page.query_selector("[aria-label='Your profile']")
        return el is not None
    except Exception:
        return True  # fallback: assume ok if not on login page


async def _scrape_and_finish(page, context, *, cookie: str) -> LoginResult:
    """Scrape uid/name/avatar and serialize session."""
    uid  = None
    name = None
    avatar_url = None

    try:
        # UID from mbasic redirect
        await page.goto("https://m.facebook.com/me", wait_until="domcontentloaded", timeout=20000)
        uid = page.url.split("?")[0].rstrip("/").split("/")[-1]
        if not uid.isdigit():
            uid = None

        # name from og:title or h1
        try:
            name = await page.title()
            name = name.replace(" | Facebook", "").strip()
        except Exception:
            pass

        # avatar from og:image
        try:
            el  = await page.query_selector("meta[property='og:image']")
            if el:
                avatar_url = await el.get_attribute("content")
        except Exception:
            pass

    except Exception as e:
        logger.warning("Scrape error: %s", e)

    session_data = json.dumps(await context.storage_state())

    return LoginResult(
        success=True,
        step=STEP_DONE,
        message="Login successful",
        uid=uid,
        name=name or "Facebook User",
        avatar_url=avatar_url,
        cookie=cookie,
        session_data=session_data,
    )


def _parse_cookie_string(cookie_str: str) -> list[dict]:
    """Convert 'key=val; key2=val2' cookie string to Playwright cookie dicts."""
    cookies = []
    for part in cookie_str.split(";"):
        part = part.strip()
        if "=" not in part:
            continue
        k, _, v = part.partition("=")
        cookies.append({
            "name": k.strip(),
            "value": v.strip(),
            "domain": ".facebook.com",
            "path": "/",
        })
    return cookies


async def _dump_cookie_string(context) -> str:
    """Dump current context cookies back to a 'key=val; ...' string."""
    cookies = await context.cookies(["https://www.facebook.com"])
    return "; ".join(f"{c['name']}={c['value']}" for c in cookies)