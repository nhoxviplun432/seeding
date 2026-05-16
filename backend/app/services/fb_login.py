"""
Playwright-based Facebook login service — 2-phase flow.

Windows fix: Playwright's asyncio subprocess transport is incompatible with
uvicorn's ProactorEventLoop. Each public function runs Playwright in a
dedicated thread that owns its own SelectorEventLoop.

Phase 1  login_facebook()  -> email/password login.
           step="2fa"      -> saves storage_state, caller stores in session_data.
                              Always manual — no auto-OTP.
           step="done"     -> no 2FA required, returns profile.
Phase 2  resume_2fa()      -> restores browser from session_data, submits user OTP.
           step="done"     -> success, caller clears session_data.
           step="2fa"      -> wrong OTP, session_data preserved for retry.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

STEP_STARTING     = "starting"
STEP_LOADING_PAGE = "loading_page"
STEP_LOGGING_IN   = "logging_in"
STEP_2FA          = "2fa"
STEP_SCRAPING     = "scraping"
STEP_SAVING       = "saving"
STEP_DONE         = "done"
STEP_CHECKPOINT   = "checkpoint"
STEP_BANNED       = "banned"
STEP_ERROR        = "error"


@dataclass
class LoginResult:
    success:      bool
    step:         str
    message:      str
    uid:          Optional[str] = None
    name:         Optional[str] = None
    avatar_url:   Optional[str] = None
    cookie:       Optional[str] = None
    session_data: Optional[str] = None  # non-None only when step=="2fa"


# ── Public API (called from FastAPI async endpoints) ──────────────────────────

async def login_facebook(
    *,
    identifier: str,
    password: str,
    cookie: Optional[str] = None,
    user_agent: Optional[str] = None,
    proxy: Optional[dict] = None,
) -> LoginResult:
    """Phase 1: email/phone + password login. Runs Playwright in an isolated thread."""
    return await _run_in_thread(
        _login_facebook_sync,
        identifier=identifier,
        password=password,
        cookie=cookie,
        user_agent=user_agent,
        proxy=proxy,
    )


async def resume_2fa(
    *,
    session_data: str,
    otp_code: str,
    user_agent: Optional[str] = None,
    proxy: Optional[dict] = None,
) -> LoginResult:
    """Phase 2: restore browser from session_data, submit OTP. Runs in isolated thread."""
    return await _run_in_thread(
        _resume_2fa_sync,
        session_data=session_data,
        otp_code=otp_code,
        user_agent=user_agent,
        proxy=proxy,
    )


# ── Thread runner ─────────────────────────────────────────────────────────────

async def _run_in_thread(sync_fn, **kwargs) -> LoginResult:
    """
    Run a sync Playwright function in a thread that owns its own event loop.
    Required on Windows where uvicorn's ProactorEventLoop blocks subprocess creation.
    """
    loop = asyncio.get_event_loop()

    def _thread_target():
        new_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(new_loop)
        try:
            return new_loop.run_until_complete(sync_fn(**kwargs))
        finally:
            new_loop.close()

    return await loop.run_in_executor(None, _thread_target)


# ── Playwright implementations (run inside isolated thread loop) ──────────────

async def _login_facebook_sync(
    *,
    identifier: str,
    password: str,
    cookie: Optional[str] = None,
    user_agent: Optional[str] = None,
    proxy: Optional[dict] = None,
) -> LoginResult:
    from playwright.async_api import async_playwright
    from playwright_stealth import Stealth

    async with Stealth().use_async(async_playwright()) as pw:
        launch_opts: dict = {"headless": True}
        if proxy:
            launch_opts["proxy"] = proxy

        browser = await pw.chromium.launch(**launch_opts)
        ctx_opts: dict = {
            "viewport": {"width": 1280, "height": 800},
            "user_agent": user_agent or (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "locale": "vi-VN",
            "timezone_id": "Asia/Ho_Chi_Minh",
        }

        context = await browser.new_context(**ctx_opts)
        page    = await context.new_page()

        try:
            # ── 1. Try existing cookie session ───────────────────────────
            if cookie:
                parsed = _parse_cookie_string(cookie)
                if parsed:
                    await context.add_cookies(parsed)
                    await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=30000)
                    if await _is_logged_in(page):
                        new_cookie = await _dump_cookie_string(context)
                        return await _scrape_and_finish(page, context, cookie=new_cookie)

            # ── 2. Password login ────────────────────────────────────────
            await page.goto("https://www.facebook.com/login", wait_until="networkidle", timeout=30000)
            email_input = page.locator("input[name='email'], #email").first
            pass_input  = page.locator("input[name='pass'], #pass").first
            await email_input.wait_for(state="visible", timeout=15000)
            await email_input.click()
            await page.wait_for_timeout(300)
            await email_input.type(identifier, delay=80)
            await page.wait_for_timeout(200)
            await pass_input.click()
            await page.wait_for_timeout(300)
            await pass_input.type(password, delay=80)
            await page.wait_for_timeout(500)
            async with page.expect_navigation(timeout=20000, wait_until="domcontentloaded"):
                await pass_input.press("Enter")

            url = page.url

            # ── 3. 2FA checkpoint — always save session, wait for manual OTP ─
            if any(k in url for k in ("checkpoint", "two_step", "two_step_verification", "login/checkpoint", "authentication")):
                state        = await context.storage_state()
                session_data = json.dumps(state)
                return LoginResult(
                    success=False,
                    step=STEP_2FA,
                    message="Cần nhập mã 2FA",
                    session_data=session_data,
                )

            # ── 4. Banned ────────────────────────────────────────────────
            if "disabled" in url or "sorry" in url:
                return LoginResult(success=False, step=STEP_BANNED, message="Account appears banned.")

            if not await _is_logged_in(page):
                return LoginResult(success=False, step=STEP_ERROR, message="Login failed — wrong password or unknown block.")

            # ── 5. Success ───────────────────────────────────────────────
            new_cookie = await _dump_cookie_string(context)
            return await _scrape_and_finish(page, context, cookie=new_cookie)

        except Exception as exc:
            logger.exception("Playwright login error")
            return LoginResult(success=False, step=STEP_ERROR, message=str(exc))
        finally:
            await browser.close()


async def _resume_2fa_sync(
    *,
    session_data: str,
    otp_code: str,
    user_agent: Optional[str] = None,
    proxy: Optional[dict] = None,
) -> LoginResult:
    from playwright.async_api import async_playwright
    from playwright_stealth import Stealth

    state = json.loads(session_data)

    async with Stealth().use_async(async_playwright()) as pw:
        launch_opts: dict = {"headless": True}
        if proxy:
            launch_opts["proxy"] = proxy

        browser = await pw.chromium.launch(**launch_opts)
        ctx_opts: dict = {"storage_state": state}
        if user_agent:
            ctx_opts["user_agent"] = user_agent

        context = await browser.new_context(**ctx_opts)
        page    = await context.new_page()

        try:
            await page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=30000)
            
            url = page.url
            if not any(k in url for k in ("checkpoint", "two_step", "two_step_verification", "login/checkpoint", "authentication")):
                if await _is_logged_in(page):
                    new_cookie = await _dump_cookie_string(context)
                    return await _scrape_and_finish(page, context, cookie=new_cookie)
                return LoginResult(
                    success=False,
                    step=STEP_ERROR,
                    message="Session expired — please login again.",
                    session_data=session_data,
                )

            try:
                navigated = await _submit_otp(page, otp_code)
            except Exception as e:
                return LoginResult(
                    success=False,
                    step=STEP_2FA,
                    message=f"OTP input not found: {e}",
                    session_data=session_data,
                )

            if not navigated or not await _is_logged_in(page):
                return LoginResult(
                    success=False,
                    step=STEP_2FA,
                    message="Mã 2FA không đúng, vui lòng thử lại.",
                    session_data=session_data,
                )

            new_cookie = await _dump_cookie_string(context)
            return await _scrape_and_finish(page, context, cookie=new_cookie)

        except Exception as exc:
            logger.exception("resume_2fa error")
            return LoginResult(
                success=False,
                step=STEP_ERROR,
                message=str(exc),
                session_data=session_data,
            )
        finally:
            await browser.close()


# ── Shared helpers ─────────────────────────────────────────────────────────────

OTP_SELECTORS = [
    "input[name='approvals_code']",
    "input[id*='approvals']",
    "input[autocomplete='one-time-code']",
    "input[type='number']",
    "input[maxlength='6']",
    "input[placeholder*='6']",
]

_2FA_URL_KEYS = (
    "checkpoint", "two_step", "two_step_verification",
    "login/checkpoint", "authentication",
)


async def _wait_for_otp_input(page, timeout_ms: int = 15000):
    """Wait for any known OTP input selector to appear, return the selector that matched."""
    selector = ", ".join(OTP_SELECTORS)
    await page.wait_for_selector(selector, timeout=timeout_ms)
    # return whichever specific selector is visible
    for sel in OTP_SELECTORS:
        el = await page.query_selector(sel)
        if el and await el.is_visible():
            return sel
    return OTP_SELECTORS[0]


async def _submit_otp(page, otp: str) -> bool:
    """Fill OTP and submit, dismiss follow-up prompts. Returns True if navigated away from 2FA."""
    sel = await _wait_for_otp_input(page)
    await page.fill(sel, otp)
    await page.wait_for_timeout(300)

    # Try submit button variants
    submitted = False
    for btn_sel in (
        "#checkpointSubmitButton",
        "button[type='submit']",
        "[data-testid='two_factor_submit']",
        "[role='button']",
    ):
        btn = await page.query_selector(btn_sel)
        if btn and await btn.is_visible():
            await btn.click()
            submitted = True
            break

    if not submitted:
        await page.keyboard.press("Enter")

    await page.wait_for_load_state("domcontentloaded", timeout=15000)
    await page.wait_for_timeout(1000)

    # Dismiss "Continue" / "Save browser" prompts
    for _ in range(3):
        url = page.url
        if not any(k in url for k in _2FA_URL_KEYS):
            break
        for btn_sel in ("#checkpointSubmitButton", "button[type='submit']"):
            btn = await page.query_selector(btn_sel)
            if btn and await btn.is_visible():
                await btn.click()
                await page.wait_for_load_state("domcontentloaded", timeout=10000)
                await page.wait_for_timeout(500)
                break
        else:
            break

    return not any(k in page.url for k in _2FA_URL_KEYS)



async def _is_logged_in(page) -> bool:
    url = page.url
    if "facebook.com" not in url:
        return False
    # still on login/checkpoint = not logged in
    blocked = ("/login", "login.php", "checkpoint", "two_step", "authentication")
    if any(k in url for k in blocked):
        return False
    return True


async def _scrape_and_finish(page, context, *, cookie: str) -> LoginResult:
    uid        = None
    name       = None
    avatar_url = None

    try:
        await page.goto("https://m.facebook.com/me", wait_until="domcontentloaded", timeout=20000)
        uid = page.url.split("?")[0].rstrip("/").split("/")[-1]
        if not uid.isdigit():
            uid = None
        try:
            name = (await page.title()).replace(" | Facebook", "").strip()
        except Exception:
            pass
        try:
            el = await page.query_selector("meta[property='og:image']")
            if el:
                avatar_url = await el.get_attribute("content")
        except Exception:
            pass
    except Exception as e:
        logger.warning("Scrape error: %s", e)

    return LoginResult(
        success=True,
        step=STEP_DONE,
        message="Login successful",
        uid=uid,
        name=name or "Facebook User",
        avatar_url=avatar_url,
        cookie=cookie,
        session_data=None,
    )


def _parse_cookie_string(cookie_str: str) -> list[dict]:
    cookies = []
    for part in cookie_str.split(";"):
        part = part.strip()
        if "=" not in part:
            continue
        k, _, v = part.partition("=")
        cookies.append({"name": k.strip(), "value": v.strip(), "domain": ".facebook.com", "path": "/"})
    return cookies


async def _dump_cookie_string(context) -> str:
    cookies = await context.cookies(["https://www.facebook.com"])
    return "; ".join(f"{c['name']}={c['value']}" for c in cookies)
