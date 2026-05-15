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
    [Arguments]    ${email}=${VALID_EMAIL}    ${password}=${VALID_PASSWORD}
    Navigate To Sign In Page
    Fill Sign In Form    ${email}    ${password}
    Submit Sign In Form

Sign In As Valid User
    [Documentation]    Sign in with the default valid test credentials and
    ...    wait for the home page redirect.
    Sign In With Credentials
    Wait For URL    **/home    timeout=${RETRY_TIMEOUT}

# ═══════════════════════════════════════════════════════════════════════════════
# Sign-out
# ═══════════════════════════════════════════════════════════════════════════════

Sign Out
    [Documentation]    Click the avatar / user menu then select Sign Out.
    ...    Adjust the selector below to match the actual logout trigger in the app.
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
