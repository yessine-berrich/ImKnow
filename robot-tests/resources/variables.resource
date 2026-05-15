*** Settings ***
Documentation    Global variables shared across all test suites


*** Variables ***
# ── Application URLs ──────────────────────────────────────────────────────────
${BASE_URL}             http://localhost:3001
${SIGNIN_URL}           ${BASE_URL}/signin
${SIGNUP_URL}           ${BASE_URL}/signup
${HOME_URL}             ${BASE_URL}/home
${SETTINGS_URL}         ${BASE_URL}/settings
${PROFILE_URL}          ${BASE_URL}/profile
${FORGOT_PWD_URL}       ${BASE_URL}/forgot-password

# ── Browser / timing ─────────────────────────────────────────────────────────
${BROWSER}              chromium
${HEADLESS}             false
${TIMEOUT}              15s
${RETRY_TIMEOUT}        20s
${VIEWPORT_WIDTH}       1280
${VIEWPORT_HEIGHT}      800

# ── Test credentials ─────────────────────────────────────────────────────────
${VALID_EMAIL}          testuser@imknow.com
${VALID_PASSWORD}       Test@1234
${WRONG_PASSWORD}       wrongpassword
${WRONG_EMAIL}          nonexistent@imknow.com

# ── Signup data ───────────────────────────────────────────────────────────────
${NEW_FIRST_NAME}       Robot
${NEW_LAST_NAME}        Tester
${RANDOM_STRING}        ${{__import__('uuid').uuid4().hex[:8]}}
${NEW_EMAIL}            robot.tester.${RANDOM_STRING}@imknow.com
${NEW_PASSWORD}         RobotTest@9876

# ── Search ────────────────────────────────────────────────────────────────────
${SEARCH_QUERY}         NestJS
