*** Settings ***
Documentation    TC_AUTH_001 – Valid login scenarios.
...
...              Verifies that a user with correct credentials can sign in
...              and is redirected to the home feed.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_AUTH_001_01 Sign-in page loads correctly
    [Documentation]    The sign-in page must display the email field, the
    ...                password field and the submit button.
    [Tags]    smoke    auth
    Navigate To Sign In Page
    Wait For Elements State    .login-form-box input[type="email"]      visible
    Wait For Elements State    .login-form-box input[type="password"]   visible
    Wait For Elements State    .login-form-box form button    visible
    Get Text    .login-form-box h1    contains    Welcome back

TC_AUTH_001_02 Successful login redirects to home
    [Documentation]    Logging in with valid credentials navigates the user
    ...                to /home.
    [Tags]    smoke    auth    regression
    Sign In As Valid User
    URL Should Contain    /home

TC_AUTH_001_03 Remember-me checkbox is clickable
    [Documentation]    The "Keep me logged in" checkbox can be checked.
    [Tags]    auth    ui
    Navigate To Sign In Page
    Click    .login-form-box input[type="checkbox"]
    ${checked}=    Get Property    .login-form-box input[type="checkbox"]    checked
    Should Be True    ${checked}

TC_AUTH_001_04 Forgot password link is present and navigates correctly
    [Documentation]    Clicking "Forgot password?" opens the reset-password page.
    [Tags]    auth    navigation
    Navigate To Sign In Page
    Click    text=Forgot password?
    Wait For URL    **/forgot-password    timeout=${RETRY_TIMEOUT}

TC_AUTH_001_05 Sign-in form is submitted with Enter key
    [Documentation]    Pressing Enter inside the password field submits the form
    ...                and redirects to /home.
    [Tags]    auth    keyboard
    Navigate To Sign In Page
    Fill Text    .login-form-box input[type="email"]      ${VALID_EMAIL}
    Fill Text    .login-form-box input[type="password"]   ${VALID_PASSWORD}
    Keyboard Key    press    Enter
    Wait For URL    **/home    timeout=${RETRY_TIMEOUT}
