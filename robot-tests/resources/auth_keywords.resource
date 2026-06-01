*** Settings ***
Documentation    Authentication-related keywords (login, logout, signup)
Library          Browser
Resource         variables.resource


*** Keywords ***
# ═══════════════════════════════════════════════════════════════════════════════
# Sign-in
# ═══════════════════════════════════════════════════════════════════════════════

Navigate To Sign In Page
    [Documentation]    Open the sign-in page and wait for the form to be ready.
    Go To    ${SIGNIN_URL}
    Wait For Elements State    .login-form-box input[type="email"]    visible    timeout=${TIMEOUT}
    Wait For Elements State    .login-form-box form button    stable    timeout=${TIMEOUT}

Fill Sign In Form
    [Documentation]    Type credentials into the sign-in form fields.
    [Arguments]    ${email}    ${password}
    Fill Text    .login-form-box input[type="email"]      ${email}
    Fill Text    .login-form-box input[type="password"]   ${password}

Submit Sign In Form
    [Documentation]    Click the Sign In submit button.
    Click    .login-form-box form button

Sign In With Credentials
    [Documentation]    Full sign-in flow: navigate → fill → submit.
    [Arguments]    ${email}=${ADMIN_EMAIL}    ${password}=${ADMIN_PASSWORD}
    Navigate To Sign In Page
    Fill Sign In Form    ${email}    ${password}
    Submit Sign In Form

Sign In As Valid User
    [Documentation]    Sign in as an authenticated user (admin) and ensure the
    ...    UI is set to French so all French-language test selectors work.
    ...    Navigates back to /home after language setup so tests start on home.
    Sign In With Credentials    ${ADMIN_EMAIL}    ${ADMIN_PASSWORD}
    Wait For URL    **/home    timeout=${RETRY_TIMEOUT}
    Set UI Language To French
    Go To    ${HOME_URL}
    Wait For Load State    domcontentloaded

Set UI Language To French
    [Documentation]    Navigate to Settings › Theme/Thème and select Français.
    ...    Idempotent — safe to call even if the language is already French.
    ...    Theme tab is called "Theme" in English and "Thème" in French.
    Go To    ${SETTINGS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Click the Theme tab — accepts "Theme" (EN) or "Thème" (FR)
    Click    button:has-text("Theme"), button:has-text("Thème")
    Wait For Load State    domcontentloaded
    Sleep    0.5s
    # Select French from the language dropdown (the select with option value="fr")
    Select Options By    select:has(option[value="fr"])    value    fr
    Sleep    1s
    Log    UI language set to French    INFO

Sign In As Employee
    [Documentation]    Sign in as a non-admin EMPLOYEE user.
    ...    Required only for access-control tests (TC_ADMIN_000).
    ...    Skips the test if the employee account is unavailable.
    Sign In With Credentials    ${VALID_EMAIL}    ${VALID_PASSWORD}
    ${ok}=    Run Keyword And Return Status    Wait For URL    **/home    timeout=10s
    Run Keyword Unless    ${ok}
    ...    Skip    Employee account ${VALID_EMAIL} not available — seed the DB with a verified employee to enable this test

# ═══════════════════════════════════════════════════════════════════════════════
# Sign-out
# ═══════════════════════════════════════════════════════════════════════════════

Sign Out
    [Documentation]    Click the avatar / user menu then select Sign Out.
    Click    [data-testid="user-menu-trigger"]
    Wait For Elements State    text=Sign Out    visible    timeout=${TIMEOUT}
    Click    text=Sign Out
    Wait For URL    **/signin    timeout=${RETRY_TIMEOUT}

# ═══════════════════════════════════════════════════════════════════════════════
# Sign-up
# ═══════════════════════════════════════════════════════════════════════════════

Navigate To Sign Up Page
    [Documentation]    Open the sign-up page and wait for the first name field.
    Go To    ${SIGNUP_URL}
    Wait For Elements State    input[name="firstName"]    visible    timeout=${TIMEOUT}

Fill Sign Up Form
    [Documentation]    Fill all fields of the registration form.
    [Arguments]    ${first_name}    ${last_name}    ${email}    ${password}
    Fill Text    input[name="firstName"]    ${first_name}
    Fill Text    input[name="lastName"]     ${last_name}
    Fill Text    input[name="email"]        ${email}
    Fill Text    input[name="password"]     ${password}

Submit Sign Up Form
    [Documentation]    Click the create-account submit button.
    Click    .register-form-box form button
