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
${NOTIFICATIONS_URL}    ${BASE_URL}/notifications
${BOOKMARKED_URL}       ${BASE_URL}/bookmarked
${LIKED_URL}            ${BASE_URL}/liked
${TRENDING_URL}         ${BASE_URL}/trending
${CONNECTIONS_URL}      ${BASE_URL}/connections
${CHAT_URL}             ${BASE_URL}/chat

# ── Admin pages ───────────────────────────────────────────────────────────────
${TAGS_ADMIN_URL}       ${BASE_URL}/tags
${CATEGORIES_URL}       ${BASE_URL}/categories
${USERS_ADMIN_URL}      ${BASE_URL}/users
${REJECTED_MOD_URL}     ${BASE_URL}/rejected/moderation
${REJECTED_DUP_URL}     ${BASE_URL}/rejected/duplicated
${REPORTED_ART_URL}     ${BASE_URL}/reported/reported-articles
${REPORTED_USR_URL}     ${BASE_URL}/reported/reported-users
${STATISTICS_URL}       ${BASE_URL}/statistics
${ERROR_403_URL}        ${BASE_URL}/error-403

# ── Admin credentials (⚠ à remplacer par un compte ADMIN réel) ───────────────
${ADMIN_EMAIL}          admin@imknow.com
${ADMIN_PASSWORD}       Admin@1234

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
